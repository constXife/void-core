use std::collections::BTreeMap;
use std::sync::Mutex;

pub const ASSISTANT_CONFIRM_TOKENS_DDL: &str = r#"
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS assistant_confirm_tokens (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash      text        NOT NULL UNIQUE,
    auth_subject    text        NOT NULL,
    tool_id         text        NOT NULL,
    payload         jsonb       NOT NULL,
    diff_summary    jsonb       NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL,
    consumed_at     timestamptz,
    apply_result    jsonb,
    CONSTRAINT assistant_confirm_tokens_expiry_after_creation
        CHECK (expires_at > created_at),
    CONSTRAINT assistant_confirm_tokens_consumed_has_result
        CHECK ((consumed_at IS NULL) = (apply_result IS NULL))
);

CREATE INDEX IF NOT EXISTS assistant_confirm_tokens_subject_active_idx
    ON assistant_confirm_tokens (auth_subject, created_at DESC)
    WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS assistant_confirm_tokens_expires_idx
    ON assistant_confirm_tokens (expires_at)
    WHERE consumed_at IS NULL;
"#;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CreateConfirmToken {
    pub id: String,
    pub token_hash: String,
    pub auth_subject: String,
    pub tool_id: String,
    pub payload_json: String,
    pub diff_summary_json: String,
    pub created_at_unix: i64,
    pub expires_at_unix: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConsumeConfirmToken {
    pub token_hash: String,
    pub auth_subject: String,
    pub tool_id: String,
    pub now_unix: i64,
    pub apply_result_json: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfirmTokenRecord {
    pub id: String,
    pub token_hash: String,
    pub auth_subject: String,
    pub tool_id: String,
    pub payload_json: String,
    pub diff_summary_json: String,
    pub created_at_unix: i64,
    pub expires_at_unix: i64,
    pub consumed_at_unix: Option<i64>,
    pub apply_result_json: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ConfirmTokenError {
    InvalidExpiry,
    DuplicateTokenHash,
    TokenNotFound,
    AuthSubjectMismatch,
    ToolMismatch,
    TokenExpired,
    ApplyResultRequired,
    StorePoisoned,
}

pub trait ConfirmTokenStore {
    fn ensure_schema(&self) -> Result<(), ConfirmTokenError>;
    fn create_token(
        &self,
        request: CreateConfirmToken,
    ) -> Result<ConfirmTokenRecord, ConfirmTokenError>;
    fn consume_token(
        &self,
        request: ConsumeConfirmToken,
    ) -> Result<ConfirmTokenRecord, ConfirmTokenError>;
    fn cleanup_expired(&self, now_unix: i64) -> Result<usize, ConfirmTokenError>;
}

#[derive(Debug, Default)]
pub struct InMemoryConfirmTokenStore {
    records_by_hash: Mutex<BTreeMap<String, ConfirmTokenRecord>>,
}

impl InMemoryConfirmTokenStore {
    pub fn new() -> Self {
        Self {
            records_by_hash: Mutex::new(BTreeMap::new()),
        }
    }
}

impl ConfirmTokenStore for InMemoryConfirmTokenStore {
    fn ensure_schema(&self) -> Result<(), ConfirmTokenError> {
        Ok(())
    }

    fn create_token(
        &self,
        request: CreateConfirmToken,
    ) -> Result<ConfirmTokenRecord, ConfirmTokenError> {
        if request.expires_at_unix <= request.created_at_unix {
            return Err(ConfirmTokenError::InvalidExpiry);
        }
        let mut records = self
            .records_by_hash
            .lock()
            .map_err(|_| ConfirmTokenError::StorePoisoned)?;
        if records.contains_key(request.token_hash.as_str()) {
            return Err(ConfirmTokenError::DuplicateTokenHash);
        }
        let record = ConfirmTokenRecord {
            id: request.id,
            token_hash: request.token_hash.clone(),
            auth_subject: request.auth_subject,
            tool_id: request.tool_id,
            payload_json: request.payload_json,
            diff_summary_json: request.diff_summary_json,
            created_at_unix: request.created_at_unix,
            expires_at_unix: request.expires_at_unix,
            consumed_at_unix: None,
            apply_result_json: None,
        };
        records.insert(request.token_hash, record.clone());
        Ok(record)
    }

    fn consume_token(
        &self,
        request: ConsumeConfirmToken,
    ) -> Result<ConfirmTokenRecord, ConfirmTokenError> {
        if request.apply_result_json.trim().is_empty() {
            return Err(ConfirmTokenError::ApplyResultRequired);
        }
        let mut records = self
            .records_by_hash
            .lock()
            .map_err(|_| ConfirmTokenError::StorePoisoned)?;
        let record = records
            .get_mut(request.token_hash.as_str())
            .ok_or(ConfirmTokenError::TokenNotFound)?;
        if record.auth_subject != request.auth_subject {
            return Err(ConfirmTokenError::AuthSubjectMismatch);
        }
        if record.tool_id != request.tool_id {
            return Err(ConfirmTokenError::ToolMismatch);
        }
        if let Some(_) = record.consumed_at_unix {
            return Ok(record.clone());
        }
        if record.expires_at_unix <= request.now_unix {
            return Err(ConfirmTokenError::TokenExpired);
        }
        record.consumed_at_unix = Some(request.now_unix);
        record.apply_result_json = Some(request.apply_result_json);
        Ok(record.clone())
    }

    fn cleanup_expired(&self, now_unix: i64) -> Result<usize, ConfirmTokenError> {
        let mut records = self
            .records_by_hash
            .lock()
            .map_err(|_| ConfirmTokenError::StorePoisoned)?;
        let before = records.len();
        records.retain(|_, record| {
            record.consumed_at_unix.is_some() || record.expires_at_unix > now_unix
        });
        Ok(before - records.len())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn consume_token_is_idempotent_after_first_apply() {
        let store = InMemoryConfirmTokenStore::new();
        store.create_token(create_request()).expect("create token");

        let first = store
            .consume_token(consume_request(r#"{"status":"ok"}"#))
            .expect("first consume");
        let second = store
            .consume_token(consume_request(r#"{"status":"different"}"#))
            .expect("second consume");

        assert_eq!(first.consumed_at_unix, Some(20));
        assert_eq!(
            first.apply_result_json.as_deref(),
            Some(r#"{"status":"ok"}"#)
        );
        assert_eq!(second.apply_result_json, first.apply_result_json);
    }

    #[test]
    fn consume_token_rejects_wrong_tool() {
        let store = InMemoryConfirmTokenStore::new();
        store.create_token(create_request()).expect("create token");

        let error = store
            .consume_token(ConsumeConfirmToken {
                tool_id: "inventory.location.create.apply".to_string(),
                ..consume_request(r#"{"status":"ok"}"#)
            })
            .expect_err("tool mismatch");

        assert_eq!(error, ConfirmTokenError::ToolMismatch);
    }

    #[test]
    fn cleanup_removes_only_unconsumed_expired_tokens() {
        let store = InMemoryConfirmTokenStore::new();
        store.create_token(create_request()).expect("create token");
        store
            .create_token(CreateConfirmToken {
                id: "token-2".to_string(),
                token_hash: "hash-2".to_string(),
                expires_at_unix: 12,
                ..create_request()
            })
            .expect("create second token");
        store
            .consume_token(ConsumeConfirmToken {
                token_hash: "hash-2".to_string(),
                now_unix: 11,
                ..consume_request(r#"{"status":"ok"}"#)
            })
            .expect("consume second token");

        assert_eq!(store.cleanup_expired(40).expect("cleanup"), 1);
        assert_eq!(
            store
                .consume_token(consume_request(r#"{"status":"ok"}"#))
                .expect_err("expired removed"),
            ConfirmTokenError::TokenNotFound
        );
        assert!(store
            .consume_token(ConsumeConfirmToken {
                token_hash: "hash-2".to_string(),
                now_unix: 21,
                ..consume_request(r#"{"status":"again"}"#)
            })
            .is_ok());
    }

    fn create_request() -> CreateConfirmToken {
        CreateConfirmToken {
            id: "token-1".to_string(),
            token_hash: "hash-1".to_string(),
            auth_subject: "subject-1".to_string(),
            tool_id: "inventory.item.create.apply".to_string(),
            payload_json: r#"{"item":"mug"}"#.to_string(),
            diff_summary_json: r#"{"title":"Create item"}"#.to_string(),
            created_at_unix: 10,
            expires_at_unix: 30,
        }
    }

    fn consume_request(apply_result_json: &str) -> ConsumeConfirmToken {
        ConsumeConfirmToken {
            token_hash: "hash-1".to_string(),
            auth_subject: "subject-1".to_string(),
            tool_id: "inventory.item.create.apply".to_string(),
            now_unix: 20,
            apply_result_json: apply_result_json.to_string(),
        }
    }
}
