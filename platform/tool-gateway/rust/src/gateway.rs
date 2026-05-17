use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub enum ToolCategory {
    Read,
    WebSearch,
    WebFetch,
    Actuator,
    Sensor,
    CuratedMcp,
    DevNavigation,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TrustClass {
    TrustedGraph,
    TrustedSensor,
    TrustedUserInput,
    UntrustedWeb,
    VariesByAdapter,
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ConsequenceClass {
    None,
    ReversibleWrite,
    IrreversibleOrSpending,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SurfaceKind {
    InPlatformChat,
    ExternalMcp,
    AutonomousRunner,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CategoryDecision {
    Allow,
    Deny,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ToolAllowList {
    All,
    Only(BTreeSet<String>),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ConfirmationPolicy {
    NotRequired,
    RequiredForWrites,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ToolDescriptor {
    pub id: String,
    pub category: ToolCategory,
    pub trust_class_returned: TrustClass,
    pub consequence_class: ConsequenceClass,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ToolCallContext {
    pub surface_kind: SurfaceKind,
    pub auth_subject: String,
    pub tool_id: String,
    pub confirmed_by_user: bool,
    pub rejected_by_user: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ToolGatewayPolicy {
    pub categories: BTreeMap<ToolCategory, CategoryDecision>,
    pub tools: ToolAllowList,
    pub confirmation: ConfirmationPolicy,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EffectiveDecision {
    AllowedByConfig,
    ConfirmedByUser,
    RejectedByUser,
    DeniedByConfig,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditDecision {
    pub tool_id: String,
    pub auth_subject: String,
    pub surface_kind: SurfaceKind,
    pub allowed_by_config: bool,
    pub confirmed_by_user: bool,
    pub rejected_by_user: bool,
    pub effective_decision: EffectiveDecision,
    pub reason_code: String,
    pub trust_class_returned: TrustClass,
    pub consequence_class: ConsequenceClass,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ToolGatewayDecision {
    pub audit: AuditDecision,
}

pub trait ToolGateway {
    fn decide(
        &self,
        descriptor: &ToolDescriptor,
        context: &ToolCallContext,
    ) -> ToolGatewayDecision;
}

#[derive(Clone, Debug)]
pub struct PolicyToolGateway {
    policy: ToolGatewayPolicy,
}

impl PolicyToolGateway {
    pub fn new(policy: ToolGatewayPolicy) -> Self {
        Self { policy }
    }
}

impl ToolGateway for PolicyToolGateway {
    fn decide(
        &self,
        descriptor: &ToolDescriptor,
        context: &ToolCallContext,
    ) -> ToolGatewayDecision {
        let mut allowed_by_config = true;
        let mut reason_code = "allowed".to_string();

        if descriptor.id != context.tool_id {
            allowed_by_config = false;
            reason_code = "tool_descriptor_mismatch".to_string();
        } else if !category_allowed(&self.policy, descriptor.category) {
            allowed_by_config = false;
            reason_code = "category_denied".to_string();
        } else if !tool_allowed(&self.policy.tools, descriptor.id.as_str()) {
            allowed_by_config = false;
            reason_code = "tool_denied".to_string();
        } else if context.surface_kind == SurfaceKind::AutonomousRunner
            && descriptor.consequence_class != ConsequenceClass::None
        {
            allowed_by_config = false;
            reason_code = "autonomous_write_denied".to_string();
        }

        let effective_decision = if !allowed_by_config {
            EffectiveDecision::DeniedByConfig
        } else if context.rejected_by_user {
            EffectiveDecision::RejectedByUser
        } else if confirmation_required(&self.policy, descriptor.consequence_class) {
            if context.confirmed_by_user {
                EffectiveDecision::ConfirmedByUser
            } else {
                EffectiveDecision::DeniedByConfig
            }
        } else {
            EffectiveDecision::AllowedByConfig
        };

        let reason_code = if allowed_by_config
            && confirmation_required(&self.policy, descriptor.consequence_class)
            && !context.confirmed_by_user
            && !context.rejected_by_user
        {
            "confirmation_required".to_string()
        } else {
            reason_code
        };

        ToolGatewayDecision {
            audit: AuditDecision {
                tool_id: context.tool_id.clone(),
                auth_subject: context.auth_subject.clone(),
                surface_kind: context.surface_kind,
                allowed_by_config,
                confirmed_by_user: context.confirmed_by_user,
                rejected_by_user: context.rejected_by_user,
                effective_decision,
                reason_code,
                trust_class_returned: descriptor.trust_class_returned,
                consequence_class: descriptor.consequence_class,
            },
        }
    }
}

fn category_allowed(policy: &ToolGatewayPolicy, category: ToolCategory) -> bool {
    matches!(
        policy.categories.get(&category),
        Some(CategoryDecision::Allow)
    )
}

fn tool_allowed(allow_list: &ToolAllowList, tool_id: &str) -> bool {
    match allow_list {
        ToolAllowList::All => true,
        ToolAllowList::Only(ids) => ids.contains(tool_id),
    }
}

fn confirmation_required(policy: &ToolGatewayPolicy, consequence: ConsequenceClass) -> bool {
    match policy.confirmation {
        ConfirmationPolicy::NotRequired => false,
        ConfirmationPolicy::RequiredForWrites => consequence != ConsequenceClass::None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn read_tool_allows_when_category_and_tool_match() {
        let gateway = PolicyToolGateway::new(policy(
            [(ToolCategory::Read, CategoryDecision::Allow)],
            ToolAllowList::All,
            ConfirmationPolicy::RequiredForWrites,
        ));
        let decision = gateway.decide(&read_descriptor(), &chat_context("inventory.snapshot.read"));

        assert_eq!(
            decision.audit.effective_decision,
            EffectiveDecision::AllowedByConfig
        );
        assert!(decision.audit.allowed_by_config);
    }

    #[test]
    fn write_tool_requires_confirmation() {
        let gateway = PolicyToolGateway::new(policy(
            [(ToolCategory::Actuator, CategoryDecision::Allow)],
            ToolAllowList::All,
            ConfirmationPolicy::RequiredForWrites,
        ));
        let descriptor = write_descriptor();
        let unconfirmed = gateway.decide(&descriptor, &chat_context("inventory.item.create.apply"));

        assert_eq!(
            unconfirmed.audit.effective_decision,
            EffectiveDecision::DeniedByConfig
        );
        assert_eq!(unconfirmed.audit.reason_code, "confirmation_required");

        let confirmed = gateway.decide(
            &descriptor,
            &ToolCallContext {
                confirmed_by_user: true,
                ..chat_context("inventory.item.create.apply")
            },
        );
        assert_eq!(
            confirmed.audit.effective_decision,
            EffectiveDecision::ConfirmedByUser
        );
    }

    #[test]
    fn autonomous_runner_cannot_apply_write_tool() {
        let gateway = PolicyToolGateway::new(policy(
            [(ToolCategory::Actuator, CategoryDecision::Allow)],
            ToolAllowList::All,
            ConfirmationPolicy::RequiredForWrites,
        ));
        let decision = gateway.decide(
            &write_descriptor(),
            &ToolCallContext {
                surface_kind: SurfaceKind::AutonomousRunner,
                auth_subject: "subject-1".to_string(),
                tool_id: "inventory.item.create.apply".to_string(),
                confirmed_by_user: true,
                rejected_by_user: false,
            },
        );

        assert_eq!(
            decision.audit.effective_decision,
            EffectiveDecision::DeniedByConfig
        );
        assert_eq!(decision.audit.reason_code, "autonomous_write_denied");
    }

    fn policy<const N: usize>(
        categories: [(ToolCategory, CategoryDecision); N],
        tools: ToolAllowList,
        confirmation: ConfirmationPolicy,
    ) -> ToolGatewayPolicy {
        ToolGatewayPolicy {
            categories: BTreeMap::from(categories),
            tools,
            confirmation,
        }
    }

    fn read_descriptor() -> ToolDescriptor {
        ToolDescriptor {
            id: "inventory.snapshot.read".to_string(),
            category: ToolCategory::Read,
            trust_class_returned: TrustClass::TrustedGraph,
            consequence_class: ConsequenceClass::None,
        }
    }

    fn write_descriptor() -> ToolDescriptor {
        ToolDescriptor {
            id: "inventory.item.create.apply".to_string(),
            category: ToolCategory::Actuator,
            trust_class_returned: TrustClass::None,
            consequence_class: ConsequenceClass::ReversibleWrite,
        }
    }

    fn chat_context(tool_id: &str) -> ToolCallContext {
        ToolCallContext {
            surface_kind: SurfaceKind::InPlatformChat,
            auth_subject: "subject-1".to_string(),
            tool_id: tool_id.to_string(),
            confirmed_by_user: false,
            rejected_by_user: false,
        }
    }
}
