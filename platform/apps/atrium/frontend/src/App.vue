<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { marked } from "marked";
import interact from "interactjs";
import { tinykeys } from "tinykeys";
import {
  Activity,
  Bell,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid3X3,
  Inbox,
  Layout,
  Lock,
  LogOut,
  Globe,
  Gauge,
  Megaphone,
  Pin,
  Search,
  Server,
  Settings,
  Trash2,
  UserCog,
  Users,
  X
} from "lucide-vue-next";
import Tooltip from "./components/Tooltip.vue";

const HOTKEYS = {
  next: "D / →",
  prev: "A / ←",
  help: "?"
};

const FALLBACK_LANG = "ru";
const LANG_STORAGE_KEY = "atrium:lang";
const ENABLE_V0_EDITOR = false;
const ENABLE_V0_DEV_ADMIN_SEAMS = false;
const ENABLE_V0_RESOURCE_DETAILS = false;

const MESSAGES = {
  en: {
    "app.title": "Atrium",
    "app.spaces": "Spaces",
    "app.switchContext": "Switch your context",
    "app.searchSpaces": "Search spaces",
    "app.noSpaces": "No spaces yet.",
    "app.login": "Login",
    "app.logout": "Log out",
    "app.adminPanel": "Admin Panel",
    "app.back": "Back",
    "app.close": "Close",
    "app.addBlock": "Add block",
    "app.addBlockShort": "Add",
    "app.save": "Save",
    "app.saveDashboard": "Save dashboard",
    "app.cancel": "Cancel",
    "app.editLayout": "Edit layout",
    "app.exit": "Exit",
    "app.details": "Details",
    "app.keyboardShortcuts": "Keyboard Shortcuts",
    "app.shortcutsNavigateTitle": "Navigate spaces",
    "app.shortcutsNavigateBody": "Move between workspaces",
    "app.shortcutsHelpTitle": "Help",
    "app.shortcutsHelpBody": "Show shortcuts overlay",
    "app.loading": "Loading",
    "app.noAccessSpaces": "No spaces available for {role}.",
    "app.noAccessTitle": "No spaces have been published for your role yet.",
    "app.noAccessBody": "Atrium is active, but the operator has not assigned a shared or personal space for this account yet.",
    "app.noAccessRoleTitle": "Current role",
    "app.noAccessHelpTitle": "What to do next",
    "app.noAccessHelpBody": "If you should already have access, contact the operator or sign out and try another account.",
    "app.noAccessTrustTitle": "Why the screen stays empty",
    "auth.title": "Sign in to Atrium",
    "auth.subtitle": "Sign-in is available only when Atrium authentication is configured.",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.continue": "Continue",
    "auth.signingIn": "Signing in...",
    "auth.devQuick": "Dev quick login",
    "auth.signInAs": "Sign in as {email}",
    "auth.sso": "Sign in with SSO",
    "auth.ssoHint": "Continue through the configured OIDC provider.",
    "auth.unavailable": "Sign-in is not configured for this Atrium.",
    "auth.unavailableHint": "OIDC is not configured and local sign-in is unavailable.",
    "auth.loginFailed": "Login failed",
    "auth.logoutFailed": "Logout failed",
    "auth.requiredTitle": "Authentication Required",
    "auth.requiredBody": "Sign in to access the workspace.",
    "guest.title": "Welcome to the local Atrium",
    "guest.body": "This Atrium runs inside a private organizational or household boundary. Public spaces are shown here when they are explicitly marked as readable before login.",
    "guest.availableTitle": "Available before sign-in",
    "guest.availableNone": "Nothing public has been published yet.",
    "guest.trustNote": "Private spaces, titles, blocks, and metadata are not disclosed before sign-in.",
    "guest.loginCta": "Sign in",
    "guest.contactTitle": "Operator contact",
    "guest.contactBody": "Ask your operator for access or use the support contact configured for this contour.",
    "guest.valueTitle": "Why this Atrium exists",
    "guest.valueBody": "One entry point for local services, people, and routines instead of scattered URLs and bookmarks.",
    "guest.controlTitle": "Local control",
    "guest.controlBody": "The baseline assumes a private, owner-controlled contour without hidden SaaS dependency for basic use.",
    "guest.accessStepsTitle": "How to get access",
    "guest.accessStepsBody": "Request an account from the operator, sign in with your own identity, then Atrium will open only the spaces meant for your role.",
    "guest.publicShellTitle": "Public spaces",
    "guest.publicShellSubtitle": "Only the spaces marked public_readonly are visible here.",
    "spaces.welcomeTitle": "Welcome to Atrium",
    "spaces.welcomeBody": "Create your first space to get started.",
    "spaces.publicIntroTitle": "Public access",
    "spaces.publicIntroSubtitle": "Read-only spaces available before sign-in.",
    "spaces.publicHelp": "Public info and contact details set by the operator.",
    "spaces.family": "Family",
    "spaces.familyDesc": "Home, Kids, Admin",
    "spaces.openAdmin": "Open Admin Panel",
    "spaces.adminHint": "In Admin Panel you can create spaces and add content",
    "admin.title.spaces": "Spaces",
    "admin.title.members": "Members",
    "admin.title.content": "Content",
    "admin.title.services": "Service Catalog",
    "admin.title.dashboard": "Dashboard",
    "admin.subtitle.spaces": "Manage spaces and their settings",
    "admin.subtitle.members": "Users and access rights",
    "admin.subtitle.content": "Announcements and resources",
    "admin.subtitle.services": "Service canon and placement across spaces",
    "admin.subtitle.dashboard": "Dashboard block configuration",
    "admin.spaces.create": "New space",
    "admin.spaces.createAction": "Create space",
    "admin.spaces.active": "Active spaces",
    "admin.spaces.archived": "Archived spaces",
    "admin.spaces.edit": "Edit",
    "admin.spaces.archive": "Archive",
    "admin.spaces.restore": "Restore",
    "admin.spaces.delete": "Delete",
    "admin.spaces.editTitle": "Edit space",
    "admin.spaces.field.title": "Title",
    "admin.spaces.field.description": "Description",
    "admin.spaces.field.slug": "Slug",
    "admin.spaces.field.visibilityGroups": "Visibility groups",
    "admin.spaces.field.type": "Type",
    "admin.spaces.field.parent": "Parent",
    "admin.spaces.field.dashboardTemplate": "Dashboard template",
    "admin.spaces.field.layoutMode": "Layout mode",
    "admin.spaces.field.accessMode": "Visible before login",
    "admin.spaces.field.backgroundUrl": "Background URL",
    "admin.spaces.field.displayConfig": "Display config (JSON)",
    "admin.spaces.field.personalizationRules": "Personalization rules (JSON)",
    "admin.spaces.field.publicEntry": "Public entry",
    "admin.spaces.field.publicEntryTitle": "Public intro title",
    "admin.spaces.field.publicEntrySubtitle": "Public intro subtitle",
    "admin.spaces.field.publicEntryHelp": "Public help block",
    "admin.spaces.field.publicEntryContact": "Public contact block",
    "admin.spaces.option.parentNone": "None",
    "admin.spaces.option.templateAuto": "Auto by slug",
    "admin.spaces.option.type.audience": "Audience",
    "admin.spaces.option.type.shared": "Shared",
    "admin.spaces.option.type.system": "System",
    "admin.spaces.option.layout.grid": "Grid",
    "admin.spaces.option.layout.hero": "Hero",
    "admin.spaces.option.layout.list": "List",
    "admin.spaces.option.access.private": "Private",
    "admin.spaces.option.access.publicReadonly": "Public read-only",
    "admin.spaces.lockable": "Lockable",
    "admin.spaces.defaultPublicEntry": "Default public entry",
    "admin.spaces.placeholder.title": "Media",
    "admin.spaces.placeholder.description": "Films, music, and other things your household opens often.",
    "admin.spaces.placeholder.slug": "media",
    "admin.spaces.placeholder.visibilityGroups": "admin, user, guest",
    "admin.spaces.placeholder.backgroundUrl": "https://...",
    "admin.spaces.placeholder.publicEntryTitle": "Welcome to Atrium",
    "admin.spaces.placeholder.publicEntrySubtitle": "Local private-by-default workspace.",
    "admin.spaces.placeholder.publicEntryHelp": "Ask your operator for access.",
    "admin.spaces.placeholder.publicEntryContact": "ops@company.local",
    "admin.spaces.confirmDelete": "Delete space “{title}”?",
    "admin.spaces.confirmArchive": "Archive space “{title}”? It will disappear from the active Atrium until you restore it.",
    "admin.spaces.confirmRestore": "Restore space “{title}”? It will return to the active Atrium.",
    "admin.spaces.archivedDone": "Space archived",
    "admin.spaces.restoredDone": "Space restored",
    "admin.common.space": "Space",
    "admin.common.selectSpace": "Select space",
    "admin.common.email": "Email",
    "admin.common.role": "Role",
    "admin.common.selectRole": "Select role",
    "admin.common.validUntil": "Valid until",
    "admin.common.bulkImport": "Bulk import",
    "admin.common.title": "Title",
    "admin.common.description": "Description",
    "admin.common.body": "Body",
    "admin.common.priority": "Priority",
    "admin.common.pinned": "Pinned",
    "admin.common.audienceGroups": "Audience groups",
    "admin.common.type": "Type",
    "admin.common.url": "URL",
    "admin.common.iconUrl": "Icon URL",
    "admin.common.tags": "Tags",
    "admin.common.serviceType": "Service type",
    "admin.common.tier": "Tier",
    "admin.common.lifecycle": "Lifecycle",
    "admin.common.classification": "Classification",
    "admin.common.runbookUrl": "Runbook URL",
    "admin.common.accessPath": "Access path",
    "admin.common.dependsOn": "Depends on",
    "admin.common.ownersJson": "Owners (JSON)",
    "admin.common.linksJson": "Links (JSON)",
    "admin.common.endpointsJson": "Endpoints (JSON)",
    "admin.common.key": "Key",
    "admin.common.service": "Service",
    "admin.common.selectService": "Select service",
    "admin.common.allSpaces": "All spaces",
    "admin.common.allServices": "All services",
    "admin.common.label": "Label",
    "admin.common.group": "Group",
    "admin.common.order": "Order",
    "admin.common.primaryUrl": "Primary URL",
    "admin.common.defaultEndpoint": "Default endpoint",
    "admin.common.allowedActions": "Allowed actions",
    "admin.common.visibleLinks": "Visible links",
    "admin.common.create": "Create",
    "admin.common.import": "Import",
    "admin.common.remove": "Remove",
    "admin.common.noItems": "Nothing here yet.",
    "admin.common.option.normal": "Normal",
    "admin.common.option.high": "High",
    "admin.common.option.critical": "Critical",
    "admin.common.option.type.resource": "Resource",
    "admin.common.option.type.link": "Link",
    "admin.common.option.type.action": "Action",
    "admin.common.placeholder.email": "user@example.com",
    "admin.common.placeholder.segment": "kid-girl",
    "admin.common.placeholder.emails": "email1,email2,email3...",
    "admin.common.placeholder.title": "Title",
    "admin.common.placeholder.body": "Message...",
    "admin.common.placeholder.description": "Short description",
    "admin.common.placeholder.iconUrl": "printer or /icons/printer.svg",
    "admin.common.placeholder.url": "https://...",
    "admin.common.placeholder.tags": "tag1, tag2",
    "admin.common.placeholder.serviceType": "http/postgres/s3",
    "admin.common.placeholder.tier": "tier-1",
    "admin.common.placeholder.lifecycle": "active/deprecated",
    "admin.common.placeholder.classification": "internal/PII",
    "admin.common.placeholder.runbookUrl": "https://runbook...",
    "admin.common.placeholder.accessPath": "Access request / group",
    "admin.common.placeholder.dependsOn": "service-a, service-b",
    "admin.common.placeholder.ownersJson": "{\"team\":\"core\",\"primary\":\"a@b.com\"}",
    "admin.common.placeholder.linksJson": "{\"docs\":\"...\",\"repo\":\"...\"}",
    "admin.common.placeholder.endpointsJson": "[{\"type\":\"http\",\"url\":\"https://...\"}]",
    "admin.members.title": "Memberships",
    "admin.members.add": "Add member",
    "admin.members.none": "No members yet.",
    "admin.members.importDone": "Imported {count} members",
    "admin.members.until": "until {date}",
    "admin.members.selectSpaceError": "Select a space",
    "admin.content.announcements": "Announcements",
    "admin.content.directory": "Directory",
    "admin.content.noneAnnouncements": "No announcements yet.",
    "admin.content.noneDirectory": "No directory items yet.",
    "admin.content.createdAnnouncement": "Announcement created",
    "admin.content.updatedAnnouncement": "Announcement updated",
    "admin.content.deletedAnnouncement": "Announcement deleted",
    "admin.content.confirmDeleteAnnouncement": "Delete announcement \"{title}\"?",
    "admin.content.createdDirectory": "Directory item created",
    "admin.content.updatedDirectory": "Directory updated",
    "admin.content.deletedDirectory": "Directory item deleted",
    "admin.content.confirmDeleteDirectory": "Delete directory item \"{title}\"?",
    "admin.services.catalog": "Service catalog",
    "admin.services.none": "No services yet.",
    "admin.services.create": "Create service",
    "admin.services.edit": "Edit",
    "admin.services.editTitle": "Edit service",
    "admin.services.created": "Service created",
    "admin.services.updated": "Service updated",
    "admin.services.deleted": "Service deleted",
    "admin.services.confirmDelete": "Delete service \"{title}\"?",
    "admin.placements.title": "Placements",
    "admin.placements.spaceFilter": "Space filter",
    "admin.placements.serviceFilter": "Service filter",
    "admin.placements.none": "No placements yet.",
    "admin.placements.create": "Create placement",
    "admin.placements.created": "Placement created",
    "admin.placements.updated": "Placement updated",
    "admin.placements.deleted": "Placement deleted",
    "admin.placements.confirmDelete": "Delete placement for \"{key}\"?",
    "admin.placements.selectSpaceError": "Select a space",
    "admin.placements.selectServiceError": "Select a service",
    "admin.dashboard.templates": "Dashboard templates",
    "admin.dashboard.blocksCount": "{count} blocks",
    "admin.dashboard.editBlocks": "Edit blocks",
    "admin.dashboard.editor": "Dashboard editor",
    "admin.dashboard.preview": "Preview",
    "admin.dashboard.blocks": "Blocks",
    "admin.segment": "Segment",
    "admin.segmentSaved": "Segment updated",
    "admin.reload": "Reload config",
    "admin.reloading": "Reloading...",
    "admin.reloadDone": "Config reloaded",
    "admin.reloadFailed": "Config reload failed",
    "app.saveDone": "Saved",
    "app.saveFailed": "Save failed",
    "space.picker.title": "Spaces",
    "space.picker.subtitle": "Switch your context",
    "space.picker.results": "Results",
    "space.picker.recents": "Recents",
    "space.picker.pinned": "Pinned",
    "space.picker.all": "All spaces",
    "space.picker.pin": "Pin",
    "space.lock": "Lock space",
    "dashboard.empty.title": "Dashboard not configured yet",
    "dashboard.empty.body": "The v1 baseline keeps orientation and curated entry points visible even before heavy customization.",
    "resource.noPinned": "No pinned resources",
    "resource.noActivity": "No activity yet",
    "resource.copied": "Copied",
    "resource.copyFailed": "Copy failed",
    "resource.actionInvoked": "Action invoked",
    "resource.actionFailed": "Action failed",
    "resource.publicReadonly": "Public spaces are read-only",
    "resource.details.title": "Resource details",
    "resource.details.overview": "Overview",
    "resource.details.access": "Access",
    "resource.details.actions": "Actions",
    "resource.details.ownership": "Ownership",
    "resource.details.links": "Links",
    "resource.details.endpoints": "Endpoints",
    "resource.details.service": "Service",
    "resource.details.titleField": "Title",
    "resource.details.description": "Description",
    "resource.details.type": "Type",
    "resource.details.tier": "Tier",
    "resource.details.lifecycle": "Lifecycle",
    "resource.details.primaryLink": "Primary link",
    "resource.details.endpoint": "Endpoint",
    "resource.details.region": "Region",
    "resource.details.bucket": "Bucket",
    "resource.details.console": "Console",
    "resource.details.accessPath": "Access path",
    "resource.details.s3": "S3 details",
    "resource.details.openConsole": "Open console",
    "resource.details.copyS3": "Copy s3://",
    "resource.details.copyCli": "Copy CLI",
    "resource.details.noActions": "No actions configured.",
    "editor.addBlockTitle": "Add block",
    "editor.addBlockBody": "Choose a block type to add to the dashboard.",
    "editor.blockSettings": "Block settings",
    "editor.advanced": "Advanced layout",
    "editor.advancedHint": "Raw grid coordinates stay available when you need exact placement.",
    "editor.showAdvanced": "Show advanced",
    "editor.hideAdvanced": "Hide advanced",
    "surface.kids.title": "Safe kids entry",
    "surface.kids.subtitle": "Only the allowed and easy-to-understand things should be here.",
    "surface.kids.safeTitle": "Bounded by default",
    "surface.kids.safeBody": "Kids see a smaller, calmer surface with fewer choices and no operator-only controls.",
    "surface.kids.allowedTitle": "Allowed now",
    "surface.kids.allowedBody": "These entries are prepared for safe access without extra navigation.",
    "surface.kids.helpTitle": "When something is unavailable",
    "surface.kids.helpBody": "Messages stay gentle and human-readable. Ask an adult or operator if something important is missing.",
    "surface.admin.title": "Operator control surface",
    "surface.admin.subtitle": "State, risk, and next steps come before the tool list.",
    "surface.admin.backupTitle": "Backup posture",
    "surface.admin.backupBody": "Backup entry points should stay visible from the first screen so restore does not begin from guesswork.",
    "surface.admin.updateTitle": "Update readiness",
    "surface.admin.updateBody": "Before changing the contour, confirm rollback readiness and the critical services that must survive the rollout.",
    "surface.admin.criticalTitle": "Critical signals",
    "surface.admin.criticalBody": "Problems should rise above ordinary links. If nothing is flagged, Atrium should say so calmly.",
    "surface.admin.recoveryTitle": "Recovery actions",
    "surface.admin.recoveryBody": "The operator needs a next step: backup storage, observability, identity surface, and restore-oriented guidance.",
    "surface.state.ready": "Ready",
    "surface.state.review": "Needs review",
    "surface.state.clear": "No critical alerts",
    "surface.state.attention": "Needs attention",
    "surface.state.guided": "Guided",
    "surface.action.openResource": "Open resource",
    "surface.action.openAdmin": "Open admin panel",
    "surface.action.reviewServices": "Review services",
    "block.type.announcements": "Announcements",
    "block.type.resourcesPinned": "Pinned resources",
    "block.type.ticketsInbox": "Tickets inbox",
    "block.type.ticketsQueue": "Tickets queue",
    "block.type.activityFeed": "Activity feed",
    "block.type.quickActions": "Quick actions",
    "block.type.text": "Text",
    "block.emptyAnnouncements": "No announcements",
    "language.title": "Language",
    "performance.title": "Performance",
    "performance.auto": "Auto",
    "performance.low": "Low",
    "performance.normal": "Normal",
    "role.switch": "Switch role",
    "role.actingAs": "Admin session • acting as {role}"
  },
  ru: {
    "app.title": "Atrium",
    "app.spaces": "Пространства",
    "app.switchContext": "Переключайте контекст",
    "app.searchSpaces": "Поиск пространств",
    "app.noSpaces": "Пространств пока нет.",
    "app.login": "Войти",
    "app.logout": "Выйти",
    "app.adminPanel": "Панель администратора",
    "app.back": "Назад",
    "app.close": "Закрыть",
    "app.addBlock": "Добавить блок",
    "app.addBlockShort": "Добавить",
    "app.save": "Сохранить",
    "app.saveDashboard": "Сохранить дашборд",
    "app.cancel": "Отмена",
    "app.editLayout": "Редактировать раскладку",
    "app.exit": "Выйти",
    "app.details": "Детали",
    "app.keyboardShortcuts": "Горячие клавиши",
    "app.shortcutsNavigateTitle": "Навигация по пространствам",
    "app.shortcutsNavigateBody": "Перемещение между рабочими поверхностями",
    "app.shortcutsHelpTitle": "Помощь",
    "app.shortcutsHelpBody": "Показать окно с клавишами",
    "app.loading": "Загрузка",
    "app.noAccessSpaces": "Для роли {role} пока нет доступных пространств.",
    "app.noAccessTitle": "Для вашей роли пространства ещё не опубликованы.",
    "app.noAccessBody": "Atrium уже работает, но оператор пока не назначил для этой учётной записи ни одного общего или персонального пространства.",
    "app.noAccessRoleTitle": "Текущая роль",
    "app.noAccessHelpTitle": "Что делать дальше",
    "app.noAccessHelpBody": "Если доступ уже должен быть, свяжитесь с оператором или выйдите и войдите под другой учётной записью.",
    "app.noAccessTrustTitle": "Почему экран остаётся пустым",
    "auth.title": "Вход в Atrium",
    "auth.subtitle": "Вход доступен только после настройки аутентификации Atrium.",
    "auth.email": "Email",
    "auth.password": "Пароль",
    "auth.continue": "Продолжить",
    "auth.signingIn": "Входим...",
    "auth.devQuick": "Быстрый вход для разработки",
    "auth.signInAs": "Войти как {email}",
    "auth.sso": "Войти через SSO",
    "auth.ssoHint": "Продолжить через настроенный OIDC-провайдер.",
    "auth.unavailable": "Для этого Atrium вход сейчас не настроен.",
    "auth.unavailableHint": "OIDC не настроен, а локальный вход недоступен.",
    "auth.loginFailed": "Ошибка входа",
    "auth.logoutFailed": "Ошибка выхода",
    "auth.requiredTitle": "Требуется вход",
    "auth.requiredBody": "Войдите, чтобы открыть рабочее пространство.",
    "guest.title": "Atrium локального контура",
    "guest.body": "Этот Atrium работает внутри приватного организационного или домашнего контура. Здесь показываются только те пространства, которые явно помечены как доступные до входа.",
    "guest.availableTitle": "Доступно до входа",
    "guest.availableNone": "Публичный контент ещё не опубликован.",
    "guest.trustNote": "Приватные пространства, их названия, блоки и метаданные до входа не раскрываются.",
    "guest.loginCta": "Войти",
    "guest.contactTitle": "Контакт оператора",
    "guest.contactBody": "Запросите доступ у оператора или используйте контакт поддержки, указанный для этого контура.",
    "guest.valueTitle": "Зачем здесь Atrium",
    "guest.valueBody": "Одна точка входа в локальные сервисы, людей и повседневные процессы вместо набора разрозненных URL и закладок.",
    "guest.controlTitle": "Локальный контроль",
    "guest.controlBody": "Базовая модель предполагает приватный контур под контролем владельца без скрытой SaaS-зависимости для базовой работы.",
    "guest.accessStepsTitle": "Как получить доступ",
    "guest.accessStepsBody": "Запросите учётную запись у оператора, войдите под своей личностью, и Atrium покажет только те пространства, которые соответствуют вашей роли.",
    "guest.publicShellTitle": "Публичные пространства",
    "guest.publicShellSubtitle": "Здесь видны только пространства с режимом public_readonly.",
    "spaces.welcomeTitle": "Добро пожаловать в Atrium",
    "spaces.welcomeBody": "Создайте своё первое пространство, чтобы начать работу.",
    "spaces.publicIntroTitle": "Публичный доступ",
    "spaces.publicIntroSubtitle": "Пространства только для чтения, доступные до входа.",
    "spaces.publicHelp": "Публичная информация и контакты настраиваются оператором.",
    "spaces.family": "Семья",
    "spaces.familyDesc": "Home, Kids, Admin",
    "spaces.openAdmin": "Открыть Admin Panel",
    "spaces.adminHint": "В Admin Panel вы можете создать пространства и добавить контент",
    "admin.title.spaces": "Пространства",
    "admin.title.members": "Участники",
    "admin.title.content": "Контент",
    "admin.title.services": "Каталог сервисов",
    "admin.title.dashboard": "Дашборд",
    "admin.subtitle.spaces": "Управление пространствами и их настройками",
    "admin.subtitle.members": "Пользователи и права доступа",
    "admin.subtitle.content": "Объявления и ресурсы",
    "admin.subtitle.services": "Каноника сервисов и размещение по пространствам",
    "admin.subtitle.dashboard": "Конфигурация блоков дашборда",
    "admin.spaces.create": "Новое пространство",
    "admin.spaces.createAction": "Создать пространство",
    "admin.spaces.active": "Активные пространства",
    "admin.spaces.archived": "Архивированные пространства",
    "admin.spaces.edit": "Изменить",
    "admin.spaces.archive": "В архив",
    "admin.spaces.restore": "Восстановить",
    "admin.spaces.delete": "Удалить",
    "admin.spaces.editTitle": "Изменить пространство",
    "admin.spaces.field.title": "Название",
    "admin.spaces.field.description": "Описание",
    "admin.spaces.field.slug": "Slug",
    "admin.spaces.field.visibilityGroups": "Группы видимости",
    "admin.spaces.field.type": "Тип",
    "admin.spaces.field.parent": "Родитель",
    "admin.spaces.field.dashboardTemplate": "Шаблон дашборда",
    "admin.spaces.field.layoutMode": "Режим раскладки",
    "admin.spaces.field.accessMode": "Видно до входа",
    "admin.spaces.field.backgroundUrl": "Фоновый URL",
    "admin.spaces.field.displayConfig": "Display config (JSON)",
    "admin.spaces.field.personalizationRules": "Personalization rules (JSON)",
    "admin.spaces.field.publicEntry": "Публичный вход",
    "admin.spaces.field.publicEntryTitle": "Заголовок публичного входа",
    "admin.spaces.field.publicEntrySubtitle": "Подзаголовок публичного входа",
    "admin.spaces.field.publicEntryHelp": "Блок помощи",
    "admin.spaces.field.publicEntryContact": "Контактный блок",
    "admin.spaces.option.parentNone": "Нет",
    "admin.spaces.option.templateAuto": "Авто по slug",
    "admin.spaces.option.type.audience": "Аудитория",
    "admin.spaces.option.type.shared": "Общее",
    "admin.spaces.option.type.system": "Системное",
    "admin.spaces.option.layout.grid": "Сетка",
    "admin.spaces.option.layout.hero": "Hero",
    "admin.spaces.option.layout.list": "Список",
    "admin.spaces.option.access.private": "Приватное",
    "admin.spaces.option.access.publicReadonly": "Публичное только для чтения",
    "admin.spaces.lockable": "Можно блокировать",
    "admin.spaces.defaultPublicEntry": "Публичный вход по умолчанию",
    "admin.spaces.placeholder.title": "Медиа",
    "admin.spaces.placeholder.description": "Фильмы, музыка и другие вещи, которые семья часто открывает.",
    "admin.spaces.placeholder.slug": "media",
    "admin.spaces.placeholder.visibilityGroups": "admin, user, guest",
    "admin.spaces.placeholder.backgroundUrl": "https://...",
    "admin.spaces.placeholder.publicEntryTitle": "Добро пожаловать в Atrium",
    "admin.spaces.placeholder.publicEntrySubtitle": "Локальное приватное пространство по умолчанию.",
    "admin.spaces.placeholder.publicEntryHelp": "Запросите доступ у оператора.",
    "admin.spaces.placeholder.publicEntryContact": "ops@company.local",
    "admin.spaces.confirmDelete": "Удалить пространство «{title}»?",
    "admin.spaces.confirmArchive": "Архивировать пространство «{title}»? Оно исчезнет из активного Atrium, пока вы не вернёте его обратно.",
    "admin.spaces.confirmRestore": "Восстановить пространство «{title}»? Оно снова появится в активном Atrium.",
    "admin.spaces.archivedDone": "Пространство архивировано",
    "admin.spaces.restoredDone": "Пространство восстановлено",
    "admin.common.space": "Пространство",
    "admin.common.selectSpace": "Выберите пространство",
    "admin.common.email": "Email",
    "admin.common.role": "Роль",
    "admin.common.selectRole": "Выберите роль",
    "admin.common.validUntil": "Действует до",
    "admin.common.bulkImport": "Массовый импорт",
    "admin.common.title": "Название",
    "admin.common.description": "Описание",
    "admin.common.body": "Текст",
    "admin.common.priority": "Приоритет",
    "admin.common.pinned": "Закрепить",
    "admin.common.audienceGroups": "Группы аудитории",
    "admin.common.type": "Тип",
    "admin.common.url": "URL",
    "admin.common.iconUrl": "URL иконки",
    "admin.common.tags": "Теги",
    "admin.common.serviceType": "Тип сервиса",
    "admin.common.tier": "Уровень",
    "admin.common.lifecycle": "Жизненный цикл",
    "admin.common.classification": "Классификация",
    "admin.common.runbookUrl": "URL runbook",
    "admin.common.accessPath": "Путь доступа",
    "admin.common.dependsOn": "Зависит от",
    "admin.common.ownersJson": "Owners (JSON)",
    "admin.common.linksJson": "Links (JSON)",
    "admin.common.endpointsJson": "Endpoints (JSON)",
    "admin.common.key": "Ключ",
    "admin.common.service": "Сервис",
    "admin.common.selectService": "Выберите сервис",
    "admin.common.allSpaces": "Все пространства",
    "admin.common.allServices": "Все сервисы",
    "admin.common.label": "Подпись",
    "admin.common.group": "Группа",
    "admin.common.order": "Порядок",
    "admin.common.primaryUrl": "Основной URL",
    "admin.common.defaultEndpoint": "Endpoint по умолчанию",
    "admin.common.allowedActions": "Разрешённые действия",
    "admin.common.visibleLinks": "Видимые ссылки",
    "admin.common.create": "Создать",
    "admin.common.import": "Импортировать",
    "admin.common.remove": "Убрать",
    "admin.common.noItems": "Пока пусто.",
    "admin.common.option.normal": "Обычный",
    "admin.common.option.high": "Высокий",
    "admin.common.option.critical": "Критичный",
    "admin.common.option.type.resource": "Ресурс",
    "admin.common.option.type.link": "Ссылка",
    "admin.common.option.type.action": "Действие",
    "admin.common.placeholder.email": "user@example.com",
    "admin.common.placeholder.segment": "kid-girl",
    "admin.common.placeholder.emails": "email1,email2,email3...",
    "admin.common.placeholder.title": "Название",
    "admin.common.placeholder.body": "Сообщение...",
    "admin.common.placeholder.description": "Короткое описание",
    "admin.common.placeholder.iconUrl": "printer или /icons/printer.svg",
    "admin.common.placeholder.url": "https://...",
    "admin.common.placeholder.tags": "tag1, tag2",
    "admin.common.placeholder.serviceType": "http/postgres/s3",
    "admin.common.placeholder.tier": "tier-1",
    "admin.common.placeholder.lifecycle": "active/deprecated",
    "admin.common.placeholder.classification": "internal/PII",
    "admin.common.placeholder.runbookUrl": "https://runbook...",
    "admin.common.placeholder.accessPath": "Запрос доступа / группа",
    "admin.common.placeholder.dependsOn": "service-a, service-b",
    "admin.common.placeholder.ownersJson": "{\"team\":\"core\",\"primary\":\"a@b.com\"}",
    "admin.common.placeholder.linksJson": "{\"docs\":\"...\",\"repo\":\"...\"}",
    "admin.common.placeholder.endpointsJson": "[{\"type\":\"http\",\"url\":\"https://...\"}]",
    "admin.members.title": "Участники",
    "admin.members.add": "Добавить участника",
    "admin.members.none": "Участников пока нет.",
    "admin.members.importDone": "Импортировано участников: {count}",
    "admin.members.until": "до {date}",
    "admin.members.selectSpaceError": "Выберите пространство",
    "admin.content.announcements": "Объявления",
    "admin.content.directory": "Каталог",
    "admin.content.noneAnnouncements": "Объявлений пока нет.",
    "admin.content.noneDirectory": "Элементов каталога пока нет.",
    "admin.content.createdAnnouncement": "Объявление создано",
    "admin.content.updatedAnnouncement": "Объявление обновлено",
    "admin.content.deletedAnnouncement": "Объявление удалено",
    "admin.content.confirmDeleteAnnouncement": "Удалить объявление «{title}»?",
    "admin.content.createdDirectory": "Элемент каталога создан",
    "admin.content.updatedDirectory": "Каталог обновлён",
    "admin.content.deletedDirectory": "Элемент каталога удалён",
    "admin.content.confirmDeleteDirectory": "Удалить элемент каталога «{title}»?",
    "admin.services.catalog": "Каталог сервисов",
    "admin.services.none": "Сервисов пока нет.",
    "admin.services.create": "Создать сервис",
    "admin.services.edit": "Изменить",
    "admin.services.editTitle": "Изменить сервис",
    "admin.services.created": "Сервис создан",
    "admin.services.updated": "Сервис обновлён",
    "admin.services.deleted": "Сервис удалён",
    "admin.services.confirmDelete": "Удалить сервис «{title}»?",
    "admin.placements.title": "Размещения",
    "admin.placements.spaceFilter": "Фильтр по пространству",
    "admin.placements.serviceFilter": "Фильтр по сервису",
    "admin.placements.none": "Размещений пока нет.",
    "admin.placements.create": "Создать размещение",
    "admin.placements.created": "Размещение создано",
    "admin.placements.updated": "Размещение обновлено",
    "admin.placements.deleted": "Размещение удалено",
    "admin.placements.confirmDelete": "Удалить размещение для «{key}»?",
    "admin.placements.selectSpaceError": "Выберите пространство",
    "admin.placements.selectServiceError": "Выберите сервис",
    "admin.dashboard.templates": "Шаблоны дашборда",
    "admin.dashboard.blocksCount": "Блоков: {count}",
    "admin.dashboard.editBlocks": "Изменить блоки",
    "admin.dashboard.editor": "Редактор дашборда",
    "admin.dashboard.preview": "Предпросмотр",
    "admin.dashboard.blocks": "Блоки",
    "admin.segment": "Сегмент",
    "admin.segmentSaved": "Сегмент обновлен",
    "admin.reload": "Перезагрузить конфиг",
    "admin.reloading": "Перезагрузка...",
    "admin.reloadDone": "Конфиг перезагружен",
    "admin.reloadFailed": "Не удалось перезагрузить конфиг",
    "app.saveDone": "Сохранено",
    "app.saveFailed": "Не удалось сохранить",
    "space.picker.title": "Пространства",
    "space.picker.subtitle": "Переключайте контекст",
    "space.picker.results": "Результаты",
    "space.picker.recents": "Недавние",
    "space.picker.pinned": "Закрепленные",
    "space.picker.all": "Все пространства",
    "space.picker.pin": "Закрепить",
    "space.lock": "Блокировка пространства",
    "dashboard.empty.title": "Дашборд пока не настроен",
    "dashboard.empty.body": "В baseline v1 сначала должны быть видны ориентация и curated entry points, а уже потом глубокая кастомизация.",
    "resource.noPinned": "Закрепленных ресурсов пока нет",
    "resource.noActivity": "Активности пока нет",
    "resource.copied": "Скопировано",
    "resource.copyFailed": "Не удалось скопировать",
    "resource.actionInvoked": "Действие запущено",
    "resource.actionFailed": "Не удалось выполнить действие",
    "resource.publicReadonly": "Публичные пространства доступны только для чтения",
    "resource.details.title": "Детали ресурса",
    "resource.details.overview": "Обзор",
    "resource.details.access": "Доступ",
    "resource.details.actions": "Действия",
    "resource.details.ownership": "Владение",
    "resource.details.links": "Ссылки",
    "resource.details.endpoints": "Эндпоинты",
    "resource.details.service": "Сервис",
    "resource.details.titleField": "Название",
    "resource.details.description": "Описание",
    "resource.details.type": "Тип",
    "resource.details.tier": "Тир",
    "resource.details.lifecycle": "Жизненный цикл",
    "resource.details.primaryLink": "Основная ссылка",
    "resource.details.endpoint": "Эндпоинт",
    "resource.details.region": "Регион",
    "resource.details.bucket": "Бакет",
    "resource.details.console": "Консоль",
    "resource.details.accessPath": "Путь доступа",
    "resource.details.s3": "S3 детали",
    "resource.details.openConsole": "Открыть консоль",
    "resource.details.copyS3": "Скопировать s3://",
    "resource.details.copyCli": "Скопировать CLI",
    "resource.details.noActions": "Действия пока не настроены.",
    "editor.addBlockTitle": "Добавить блок",
    "editor.addBlockBody": "Выберите тип блока, который нужно добавить в дашборд.",
    "editor.blockSettings": "Настройки блока",
    "editor.advanced": "Продвинутая раскладка",
    "editor.advancedHint": "Сырые координаты сетки остаются доступны, когда нужен точный контроль.",
    "editor.showAdvanced": "Показать расширенные настройки",
    "editor.hideAdvanced": "Скрыть расширенные настройки",
    "surface.kids.title": "Безопасный детский вход",
    "surface.kids.subtitle": "Здесь должны оставаться только разрешённые и понятные вещи.",
    "surface.kids.safeTitle": "Ограничено по умолчанию",
    "surface.kids.safeBody": "Дети видят более спокойную поверхность с меньшим выбором и без операторских элементов управления.",
    "surface.kids.allowedTitle": "Разрешено сейчас",
    "surface.kids.allowedBody": "Эти входы подготовлены для безопасного использования без лишней навигации.",
    "surface.kids.helpTitle": "Если что-то недоступно",
    "surface.kids.helpBody": "Сообщения должны оставаться мягкими и понятными. Если чего-то важного не хватает, нужен взрослый или оператор.",
    "surface.admin.title": "Операторская поверхность контроля",
    "surface.admin.subtitle": "Состояние, риск и следующий шаг важнее списка инструментов.",
    "surface.admin.backupTitle": "Состояние резервных копий",
    "surface.admin.backupBody": "Точка входа к резервным копиям должна быть видна с первого экрана, чтобы восстановление не начиналось с догадок.",
    "surface.admin.updateTitle": "Готовность к обновлению",
    "surface.admin.updateBody": "Перед изменением контура проверьте готовность к откату и критичные сервисы, которые обязаны пережить обновление.",
    "surface.admin.criticalTitle": "Критичные сигналы",
    "surface.admin.criticalBody": "Проблемы должны подниматься выше обычных ссылок. Если ничего критичного нет, Atrium должен сказать это спокойно.",
    "surface.admin.recoveryTitle": "Действия для восстановления",
    "surface.admin.recoveryBody": "Оператору нужен следующий шаг: резервные копии, наблюдаемость, контур идентификации и понятный путь к восстановлению.",
    "surface.state.ready": "Готово",
    "surface.state.review": "Нужна проверка",
    "surface.state.clear": "Критичных сигналов нет",
    "surface.state.attention": "Нужно внимание",
    "surface.state.guided": "Есть следующий шаг",
    "surface.action.openResource": "Открыть ресурс",
    "surface.action.openAdmin": "Открыть панель администратора",
    "surface.action.reviewServices": "Проверить сервисы",
    "block.type.announcements": "Объявления",
    "block.type.resourcesPinned": "Закреплённые ресурсы",
    "block.type.ticketsInbox": "Входящие заявки",
    "block.type.ticketsQueue": "Очередь заявок",
    "block.type.activityFeed": "Лента активности",
    "block.type.quickActions": "Быстрые действия",
    "block.type.text": "Текст",
    "block.emptyAnnouncements": "Объявлений пока нет",
    "language.title": "Язык",
    "performance.title": "Производительность",
    "performance.auto": "Авто",
    "performance.low": "Низкая",
    "performance.normal": "Обычная",
    "role.switch": "Сменить роль",
    "role.actingAs": "Сессия администратора • роль {role}"
  }
};

const BLOCK_TYPES = {
  resourcesPinned: "core.resources_pinned",
  text: "core.text"
};

const BLOCK_TYPE_OPTIONS = [
  { value: BLOCK_TYPES.resourcesPinned, label: "Pinned resources" }
];

const BLOCK_TYPE_CARDS = [
  {
    value: BLOCK_TYPES.resourcesPinned,
    label: "Pinned resources",
    description: "Quick access links and resources.",
    icon: Bookmark
  }
];

// ============================================
// URL-based Navigation
// ============================================
const parseRoute = () => {
  const path = window.location.pathname || "/";
  const parts = path.split("/").filter(Boolean);
  
  if (parts[0] === 'admin') {
    return { 
      view: 'admin', 
      tab: parts[1] || 'spaces',
      spaceSlug: null 
    };
  }
  
  if (parts[0] === 'space' && parts[1]) {
    return { 
      view: 'spaces', 
      tab: null, 
      spaceSlug: parts[1] 
    };
  }
  
  return { view: 'spaces', tab: null, spaceSlug: null };
};

const navigateTo = (path) => {
  const nextPath = path.startsWith("/") ? path : `/${path}`;
  if (window.location.pathname === nextPath) return;
  history.pushState(null, "", nextPath);
  if (window._atriumRouteHandler) {
    window._atriumRouteHandler();
  }
};

const navigateToAdmin = (tab = 'spaces') => {
  navigateTo(`/admin/${tab}`);
};

const navigateToSpace = (slug) => {
  navigateTo(`/space/${slug}`);
};

const navigateHome = () => {
  if (lastSpaceSlug.value) {
    navigateToSpace(lastSpaceSlug.value);
  } else {
    navigateTo('/');
  }
};

const me = ref(null);
const spaces = ref([]);
const spacesAdmin = ref([]);
const archivedSpacesAdmin = ref([]);
const loading = ref(true);
const error = ref("");
const adminTab = ref("spaces");
const authEnabled = ref(true);
const authRequired = ref(false);
const loginUrl = ref("/auth/login");
const loginPageUrl = ref("/login");
const isLoginPage = ref(false);
const loginEmail = ref("");
const loginPassword = ref("");
const loginNext = ref("/");
const loginError = ref("");
const loginBusy = ref(false);
const authModes = ref({ local: true, oidc: true });
const devEnvPresent =
  typeof __ATRIUM_DEV_ENV_PRESENT__ !== "undefined" && __ATRIUM_DEV_ENV_PRESENT__;
const devAllowedEmailsRaw =
  typeof __ATRIUM_DEV_AUTH_ALLOWED_EMAILS__ === "string"
    ? __ATRIUM_DEV_AUTH_ALLOWED_EMAILS__
    : "";
const devAdminEmailsRaw =
  typeof __ATRIUM_DEV_AUTH_ADMIN_EMAILS__ === "string"
    ? __ATRIUM_DEV_AUTH_ADMIN_EMAILS__
    : "";
const devLocalEmailRaw =
  typeof __ATRIUM_DEV_AUTH_LOCAL_EMAIL__ === "string"
    ? __ATRIUM_DEV_AUTH_LOCAL_EMAIL__
    : "";
const devLocalPasswordRaw =
  typeof __ATRIUM_DEV_AUTH_LOCAL_PASSWORD__ === "string"
    ? __ATRIUM_DEV_AUTH_LOCAL_PASSWORD__
    : "";
const hasLoginOption = computed(
  () => authModes.value.oidc || showDevLogin.value
);
const showAdmin = ref(false);
const showShortcuts = ref(false);
const showUserDropdown = ref(false);
const widgets = ref([]);
const clockNow = ref(new Date());
const todoState = ref({});
const dashboards = ref({});
const dashboardData = ref({});
const dashboardLoading = ref({});
const showDashboardEditor = ref(false);
const dashboardEditorSpace = ref(null);
const dashboardEditorBlocks = ref([]);
const dashboardEditorOrder = ref([]);
const dashboardEditorSaving = ref(false);
const isMobile = ref(false);
const dashboardEditSpaceId = ref(null);
const dashboardEditDirty = ref(false);
const dashboardEditSelectedId = ref(null);
const dashboardEditAdvanced = ref(false);
const dashboardDragging = ref(false);
const dashboardDragGhost = ref(null);
const dashboardAddOpen = ref(false);
const dashboardEditPanelStyle = ref({});
const dashboardEditNewType = ref(BLOCK_TYPES.resourcesPinned);
const dashboardEditForm = ref({
  title: "",
  type: BLOCK_TYPES.resourcesPinned,
  x: 1,
  y: 1,
  w: 6,
  h: 2,
  order: 1,
  limit: 8,
  scope: "this",
  filter: "",
  text: ""
});
let clockTimer = null;
const isPageVisible = ref(typeof document === "undefined" ? true : !document.hidden);

// Inline block editing
const inlineEditBlock = ref(null);      // { block, spaceId } - Block being edited
const inlineEditPopover = ref(null);    // 'settings' | 'content' | 'add' | null
const inlineEditAdvanced = ref(false);
const inlineEditForm = ref({
  title: '',
  type: BLOCK_TYPES.resourcesPinned,
  x: 1,
  y: 1,
  w: 6,
  h: 2,
  order: 1,
  limit: 10,
  scope: "this",
  filter: "",
  text: ""
});
const inlineAddForm = ref({
  title: '',
  body: '',
  url: '',
  priority: 'normal',
  pinned: false
});
const inlineHoverRow = ref(null);       // Item ID being hovered for row editing

// Business notifications
const businessNotifications = ref([]);
const activeHeroToast = ref(null);
const heroToastProgress = ref(100);
let heroToastTimer = null;
let heroToastProgressTimer = null;
const HERO_TOAST_DURATION = 10000; // 10 seconds

const staffQuickActions = [
  { id: "sqa-1", title: "Открыть заявки", description: "Очередь / SLA / исполнители" },
  { id: "sqa-2", title: "Housekeeping", description: "Смены и чеклисты" },
  { id: "sqa-3", title: "Инциденты", description: "Критичные события" },
  { id: "sqa-4", title: "Смена статуса", description: "В работе / закрыто" }
];

const staffQueue = [
  {
    id: "sq-1",
    title: "Номер 412: нет горячей воды",
    eta: "SLA 40 мин",
    priority: "critical",
    assignee: "Инженер"
  },
  {
    id: "sq-2",
    title: "Лифт B: ошибка двери",
    eta: "SLA 2 часа",
    priority: "high",
    assignee: "Сервис"
  }
];

const staffMetrics = [
  { id: "sm-1", label: "В работе", value: "12" },
  { id: "sm-2", label: "SLA < 1ч", value: "4" },
  { id: "sm-3", label: "Просрочено", value: "1" },
  { id: "sm-4", label: "Нагрузка", value: "78%" }
];

const dismissHeroToast = () => {
  if (heroToastTimer) clearTimeout(heroToastTimer);
  if (heroToastProgressTimer) clearTimeout(heroToastProgressTimer);
  activeHeroToast.value = null;
  heroToastProgress.value = 100;
};

const roleOverrideKey = "atrium:role-override";
const roleOverride = ref("");
const roleOverrideReady = ref(false);

const actualRole = computed(() => me.value?.role || "");
const actualIsAdmin = computed(() => actualRole.value === "admin");
const effectiveRole = computed(() => roleOverride.value || actualRole.value || "");
const isAdmin = computed(() => effectiveRole.value === "admin");
const roleOverrideActive = computed(() =>
  actualIsAdmin.value &&
  !!roleOverride.value &&
  roleOverride.value !== actualRole.value &&
  roleOverride.value !== "admin"
);
const effectivePermissions = computed(() => {
  if (!me.value) return [];
  const roleKey = effectiveRole.value;
  const fromRole = Array.isArray(roles.value)
    ? roles.value.find((role) => role.key === roleKey)?.permissions
    : null;
  if (Array.isArray(fromRole) && fromRole.length > 0) return fromRole;
  if (roleOverrideActive.value) {
    return roleKey === "admin" ? ["view", "manage"] : ["view"];
  }
  const perms = Array.isArray(me.value.permissions) ? me.value.permissions : [];
  if (perms.length > 0) return perms;
  return roleKey === "admin" ? ["view", "manage"] : ["view"];
});

const canManage = computed(() => {
  if (!me.value) return false;
  return effectivePermissions.value.includes("manage") || effectiveRole.value === "admin";
});

const membershipSegmentOptions = computed(() => {
  const id = Number(membershipSpaceId.value || 0);
  const space = spacesAdmin.value.find((item) => item.id === id);
  const cfg = parseDisplayConfig(space);
  const raw =
    cfg.segment_options ||
    cfg.user_segments ||
    cfg.segments ||
    cfg.segmentOptions ||
    [];
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => String(value)).filter((value) => value);
});

marked.setOptions({ breaks: true });

const newSpace = ref({
  title: "",
  slug: "",
  type: "audience",
  parentId: "",
  dashboardTemplateId: "",
  visibilityGroups: "",
  layoutMode: "grid",
  backgroundUrl: "",
  isLockable: true,
  accessMode: "private",
  isDefaultPublicEntry: false,
  publicEntryTitle: "",
  publicEntrySubtitle: "",
  publicEntryHelp: "",
  publicEntryContact: "",
  description: "",
  displayConfig: "{}",
  personalizationRules: "{}"
});
const editSpace = ref(null);
const editDisplayConfig = ref("");
const editPersonalizationRules = ref("");
const dashboardTemplates = ref([]);
const roles = ref([]);
const memberships = ref([]);
const membershipSpaceId = ref("");
const membershipForm = ref({
  email: "",
  roleId: "",
  validTo: "",
  userSegment: ""
});
const membershipBulk = ref({
  emails: "",
  roleId: "",
  validTo: ""
});
const contentSpaceId = ref("");
const announcementsAdmin = ref([]);
const directoryAdmin = ref([]);
const servicesAdmin = ref([]);
const placementsAdmin = ref([]);
const announcementForm = ref({
  title: "",
  body: "",
  priority: "normal",
  pinned: false,
  expiresAt: "",
  audienceGroups: ""
});
const directoryForm = ref({
  title: "",
  description: "",
  iconUrl: "",
  url: "",
  type: "resource",
  pinned: false,
  tags: "",
  actionKeys: "",
  audienceGroups: "",
  serviceType: "",
  owners: "",
  links: "",
  endpoints: "",
  tier: "",
  lifecycle: "",
  accessPath: "",
  runbookUrl: "",
  classification: "",
  dependsOn: ""
});
const serviceForm = ref({
  key: "",
  title: "",
  description: "",
  iconUrl: "",
  serviceType: "",
  tags: "",
  owners: "",
  links: "",
  endpoints: "",
  tier: "",
  lifecycle: "",
  classification: "",
  dependsOn: ""
});
const serviceEditItem = ref(null);
const placementSpaceId = ref("");
const placementServiceKey = ref("");
const placementForm = ref({
  serviceKey: "",
  spaceId: "",
  label: "",
  pinned: false,
  order: 0,
  group: "",
  audienceGroups: "",
  allowedActions: "",
  visibleLinks: "",
  primaryUrl: "",
  defaultEndpoint: "",
  accessPath: ""
});
const dashboardPreviewRole = ref("admin");
const reloadConfigPending = ref(false);
const serviceDetailsOpen = ref(false);
const serviceDetailsItem = ref(null);

const stageRef = ref(null);
const hotkeysCleanup = ref(null);
const currentIndex = ref(0);
const pendingScrollIndex = ref(null);
const pinnedSpacesKey = "atrium:pinned-spaces";
const recentSpacesKey = "atrium:recent-spaces";
const recentResourcesKey = "atrium:recent-resources";
const lastSpaceSlugKey = "atrium:last-space";

const bgA = ref("");
const bgB = ref("");
const showA = ref(true);
const scrollLock = ref(false);
let scrollLockTimer = null;
const initialScrollDone = ref(false);
const spacePickerOpen = ref(false);
const spaceQuery = ref("");
const pinnedSpaceIds = ref([]);
const recentSpaceIds = ref([]);
const recentResourcesBySpace = ref({});
const lastSpaceSlug = ref("");
const backgroundTimer = ref(null);
const backgroundRandomIndex = {};
const backgroundRandomWindow = {};


const fetchJSON = async (path, options = {}) => {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text();
    const message = text || res.statusText || "Request failed";
    throw { status: res.status, message };
  }

  if (res.status === 204 || res.status === 205) {
    return null;
  }
  const text = await res.text();
  if (!text.trim()) {
    return null;
  }
  return JSON.parse(text);
};

const fetchMaybeJSON = async (path) => {
  try {
    return await fetchJSON(path);
  } catch (err) {
    if (err.status === 404) {
      authEnabled.value = false;
      return null;
    }
    if (err.status === 401 || err.status === 403) return null;
    return null;
  }
};

const setAdminSpaces = (items) => {
  const list = Array.isArray(items) ? items : [];
  spacesAdmin.value = list.filter((item) => item?.is_provisioned !== false);
  archivedSpacesAdmin.value = list.filter((item) => item?.is_provisioned === false);
};

const reloadAdminSpaces = async () => {
  const allSpaces = await fetchJSON("/api/spaces?include_archived=1");
  setAdminSpaces(allSpaces);

  if (!membershipSpaceId.value || !spacesAdmin.value.some((item) => String(item.id) === String(membershipSpaceId.value))) {
    membershipSpaceId.value = spacesAdmin.value[0] ? String(spacesAdmin.value[0].id) : "";
  }
  if (!contentSpaceId.value || !spacesAdmin.value.some((item) => String(item.id) === String(contentSpaceId.value))) {
    contentSpaceId.value = spacesAdmin.value[0] ? String(spacesAdmin.value[0].id) : "";
  }
  if (!placementSpaceId.value || !spacesAdmin.value.some((item) => String(item.id) === String(placementSpaceId.value))) {
    placementSpaceId.value = spacesAdmin.value[0] ? String(spacesAdmin.value[0].id) : "";
  }
};

const refreshAdminDataAfterSpaceChange = async () => {
  if (membershipSpaceId.value) {
    await loadMemberships(membershipSpaceId.value);
  } else {
    memberships.value = [];
  }
  if (contentSpaceId.value) {
    await onContentSpaceChange();
  } else {
    announcementsAdmin.value = [];
    directoryAdmin.value = [];
  }
  if (adminTab.value === "services") {
    ensurePlacementDefaults();
    await loadPlacements();
  }
};

const buildPublicEntry = (source) => {
  const entry = {};
  if (source.publicEntryTitle) entry.title = source.publicEntryTitle;
  if (source.publicEntrySubtitle) entry.subtitle = source.publicEntrySubtitle;
  if (source.publicEntryHelp) entry.help = source.publicEntryHelp;
  if (source.publicEntryContact) entry.contact = source.publicEntryContact;
  return entry;
};

const withRoleOverride = (path) => {
  if (!roleOverrideActive.value) return path;
  const url = new URL(path, window.location.origin);
  if (!url.searchParams.has("audience")) {
    url.searchParams.set("audience", roleOverride.value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
};

const reloadConfig = async () => {
  if (reloadConfigPending.value) return;
  reloadConfigPending.value = true;
  try {
    await fetchJSON("/api/config/reload", { method: "POST" });
    showToast(t("admin.reloadDone"), "success");
  } catch (err) {
    showToast(err.message || t("admin.reloadFailed"), "error");
  } finally {
    reloadConfigPending.value = false;
  }
};

const openServiceDetails = (item) => {
  serviceDetailsItem.value = item;
  serviceDetailsOpen.value = true;
};

const closeServiceDetails = () => {
  serviceDetailsOpen.value = false;
  serviceDetailsItem.value = null;
};

const loadAuthModes = async () => {
  try {
    authModes.value = await fetchJSON("/api/auth/modes");
  } catch {
    authModes.value = { local: true, oidc: true };
  }
};

const parseCSV = (value) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const devLoginEmails = computed(() => {
  if (!import.meta.env.DEV || !devEnvPresent) return [];
  const emails = [];
  for (const email of parseCSV(devLocalEmailRaw)) {
    if (!emails.includes(email)) emails.push(email);
  }
  for (const email of parseCSV(devAdminEmailsRaw)) {
    if (!emails.includes(email)) emails.push(email);
  }
  for (const email of parseCSV(devAllowedEmailsRaw)) {
    if (!emails.includes(email)) emails.push(email);
  }
  return emails;
});

const devLocalPassword =
  import.meta.env.DEV && devEnvPresent ? devLocalPasswordRaw : "";
const showDevLogin = computed(
  () => authModes.value.local && !!devLocalPassword && devLoginEmails.value.length > 0
);

const applyDevLogin = async (email) => {
  loginEmail.value = email;
  loginPassword.value = devLocalPassword;
  await submitLocalLogin();
};

const submitLocalLogin = async () => {
  loginError.value = "";
  loginBusy.value = true;
  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: loginEmail.value,
        password: loginPassword.value,
        next: loginNext.value
      })
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(message || t("auth.loginFailed"));
    }
    const payload = await res.json().catch(() => null);
    const redirectTo = payload?.redirect_to || loginNext.value || "/";
    window.location.assign(redirectTo);
  } catch (err) {
    loginError.value = err.message || t("auth.loginFailed");
  } finally {
    loginBusy.value = false;
  }
};

const loadAll = async () => {
  loading.value = true;
  error.value = "";
  try {
    const route = parseRoute();
    try {
      me.value = await fetchMaybeJSON("/api/me");
    } catch {
      me.value = null;
    }
    if (isLoginPage.value) {
      loading.value = false;
      return;
    }
    if (route.view === "admin" && authEnabled.value && !me.value) {
      window.location.assign(loginPageUrl.value);
      return;
    }
    syncRoleOverride();

    const payload = await fetchJSON(withRoleOverride("/api/v1/workspace"));
    spaces.value = payload.spaces || [];
    if (spaces.value.length > 0) {
      let nextIndex = 0;
      let matchedRoute = false;
      if (route.spaceSlug) {
        const idx = spaces.value.findIndex(
          (space) => spaceRouteSlug(space) === route.spaceSlug
        );
        if (idx >= 0) {
          nextIndex = idx;
          matchedRoute = true;
        }
      }
      const defaultIndex = spaces.value.findIndex((space) => space.is_default_public_entry);
      if (!matchedRoute && !me.value && defaultIndex >= 0) {
        nextIndex = defaultIndex;
      }
      scrollToIndex(nextIndex, true, true);
      setBackground(spaces.value[nextIndex]);
      scheduleBackgroundRefresh();
    }
    syncLangFromContext();
    const shouldLoadAllDashboards = canManage.value;
    const targetSpaces = shouldLoadAllDashboards
      ? spaces.value
      : spaces.value.filter((space) => hasDashboard(space));
    await Promise.all(targetSpaces.map((space) => loadDashboard(space, shouldLoadAllDashboards)));

    try {
      widgets.value = await fetchJSON("/api/widgets");
    } catch {
      widgets.value = [];
    }

    if (actualIsAdmin.value && ENABLE_V0_DEV_ADMIN_SEAMS) {
      await reloadAdminSpaces();
      dashboardTemplates.value = await fetchJSON("/api/dashboard/templates");
      roles.value = await fetchJSON("/api/roles");
      if (membershipSpaceId.value) {
        await loadMemberships(membershipSpaceId.value);
      }
      if (contentSpaceId.value) {
        await onContentSpaceChange();
      }
    } else if (!me.value) {
      await loadAuthModes();
    }
  } catch (err) {
    error.value = err.message || "Failed to load";
  } finally {
    loading.value = false;
  }
};

const parseVisibilityGroups = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const formatGroups = (groups) =>
  Array.isArray(groups) ? groups.filter(Boolean).join(", ") : "";

const parseCommaList = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const formatJSON = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
};

const parseJSONInput = (value, fallback) => {
  if (!value || !value.trim()) return fallback;
  return JSON.parse(value);
};

const parseJSONInputSafe = (value, fallback, label) => {
  try {
    return parseJSONInput(value, fallback);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
};

const resolveIconUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("icons/")) return `/${raw}`;
  if (raw.includes("/")) return `/${raw}`;
  const hasExt = raw.includes(".");
  return `/icons/${raw}${hasExt ? "" : ".svg"}`;
};

const normalizeIconUrl = (value) => resolveIconUrl(value);

const mapDirectoryItem = (item) => ({
  ...item,
  audienceInput: formatGroups(item.audience_groups),
  tagsInput: formatGroups(item.tags),
  actionKeysInput: formatGroups(item.action_keys),
  ownersInput: formatJSON(item.owners, "{}"),
  linksInput: formatJSON(item.links, "{}"),
  endpointsInput: formatJSON(item.endpoints, "[]"),
  dependsOnInput: formatGroups(item.depends_on),
  serviceType: item.service_type || "",
  tier: item.tier || "",
  lifecycle: item.lifecycle || "",
  accessPath: item.access_path || "",
  runbookUrl: item.runbook_url || "",
  classification: item.classification || ""
});

const mapService = (item) => ({
  ...item,
  tagsInput: formatGroups(item.tags),
  ownersInput: formatJSON(item.owners, "{}"),
  linksInput: formatJSON(item.links, "{}"),
  endpointsInput: formatJSON(item.endpoints, "[]"),
  dependsOnInput: formatGroups(item.depends_on),
  serviceType: item.service_type || "",
  iconUrl: item.icon_url || ""
});

const mapPlacement = (item) => ({
  ...item,
  audienceInput: formatGroups(item.audience_groups),
  allowedActionsInput: formatGroups(item.allowed_actions),
  visibleLinksInput: formatGroups(item.visible_links)
});

const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseBulkEmails = (value) =>
  value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const loadMemberships = async (spaceId) => {
  if (!spaceId) {
    memberships.value = [];
    return;
  }
  try {
    const items = await fetchJSON(`/api/memberships?space_id=${spaceId}`);
    memberships.value = items.map((item) => ({
      ...item,
      user_segment: item.user_segment || ""
    }));
  } catch (err) {
    error.value = err.message || "Memberships load failed";
  }
};

const onMembershipSpaceChange = async () => {
  membershipForm.value = { ...membershipForm.value, email: "", roleId: "", validTo: "", userSegment: "" };
  await loadMemberships(membershipSpaceId.value);
};

const addMembership = async () => {
  if (!membershipSpaceId.value) {
    error.value = t("admin.members.selectSpaceError");
    return;
  }
  try {
    const payload = {
      email: membershipForm.value.email,
      space_id: Number(membershipSpaceId.value),
      role_id: Number(membershipForm.value.roleId) || 0,
      valid_to: membershipForm.value.validTo
        ? new Date(membershipForm.value.validTo).toISOString()
        : null
    };
    if (membershipForm.value.userSegment?.trim()) {
      payload.user_segment = membershipForm.value.userSegment.trim();
    }
    await fetchJSON("/api/memberships", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    membershipForm.value = { ...membershipForm.value, email: "", roleId: "", validTo: "", userSegment: "" };
    await loadMemberships(membershipSpaceId.value);
  } catch (err) {
    error.value = err.message || "Membership create failed";
  }
};

const updateMemberSegment = async (member) => {
  if (!member?.principal_id) return;
  try {
    const payload = { user_segment: (member.user_segment || "").trim() };
    await fetchJSON(`/api/users/${member.principal_id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    showToast(t("admin.segmentSaved"), "success");
  } catch (err) {
    error.value = err.message || "Segment update failed";
  }
};

const importMemberships = async () => {
  if (!membershipSpaceId.value) {
    error.value = t("admin.members.selectSpaceError");
    return;
  }
  try {
    const emails = parseBulkEmails(membershipBulk.value.emails);
    const payload = {
      space_id: Number(membershipSpaceId.value),
      role_id: Number(membershipBulk.value.roleId) || 0,
      emails,
      valid_to: membershipBulk.value.validTo
        ? new Date(membershipBulk.value.validTo).toISOString()
        : null
    };
    const result = await fetchJSON("/api/memberships/import", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    membershipBulk.value = { ...membershipBulk.value, emails: "" };
    await loadMemberships(membershipSpaceId.value);
    showToast(t("admin.members.importDone", { count: result.imported }), "success");
  } catch (err) {
    error.value = err.message || "Membership import failed";
  }
};

const removeMembership = async (member) => {
  try {
    await fetchJSON(`/api/memberships/${member.principal_id}/${member.space_id}`, {
      method: "DELETE"
    });
    memberships.value = memberships.value.filter(
      (item) => !(item.principal_id === member.principal_id && item.space_id === member.space_id)
    );
  } catch (err) {
    error.value = err.message || "Membership delete failed";
  }
};

const defaultAudienceForSpace = (spaceId) => {
  const space = spacesAdmin.value.find((item) => String(item.id) === String(spaceId));
  if (!space) return "";
  return formatGroups(space.visibility_groups);
};

const loadContent = async (spaceId) => {
  if (!spaceId) {
    announcementsAdmin.value = [];
    directoryAdmin.value = [];
    return;
  }
  try {
    const dir = await fetchJSON(`/api/directory_items?space_id=${spaceId}`);
    announcementsAdmin.value = [];
    directoryAdmin.value = dir.map((item) => mapDirectoryItem(item));
  } catch (err) {
    error.value = err.message || "Content load failed";
  }
};

const onContentSpaceChange = async () => {
  const defaults = defaultAudienceForSpace(contentSpaceId.value);
  directoryForm.value = {
    ...directoryForm.value,
    audienceGroups: defaults
  };
  await loadContent(contentSpaceId.value);
};

const createAnnouncement = async () => {
  if (!contentSpaceId.value) {
    error.value = t("admin.members.selectSpaceError");
    return;
  }
  try {
    const payload = {
      space_id: Number(contentSpaceId.value),
      title: announcementForm.value.title,
      body: announcementForm.value.body,
      priority: announcementForm.value.priority,
      pinned: announcementForm.value.pinned,
      expires_at: announcementForm.value.expiresAt
        ? new Date(announcementForm.value.expiresAt).toISOString()
        : null,
      audience_groups: parseVisibilityGroups(announcementForm.value.audienceGroups || "")
    };
    const created = await fetchJSON("/api/announcements", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    announcementsAdmin.value = [
      { ...created, audienceInput: formatGroups(created.audience_groups) },
      ...announcementsAdmin.value
    ];
    announcementForm.value = {
      title: "",
      body: "",
      priority: "normal",
      pinned: false,
      expiresAt: "",
      audienceGroups: defaultAudienceForSpace(contentSpaceId.value)
    };
    showToast(t("admin.content.createdAnnouncement"), "success");
  } catch (err) {
    error.value = err.message || "Announcement create failed";
  }
};

const updateAnnouncementAudience = async (item) => {
  try {
    const payload = {
      title: item.title,
      body: item.body,
      priority: item.priority,
      pinned: item.pinned,
      expires_at: item.expiresInput ? new Date(item.expiresInput).toISOString() : null,
      audience_groups: parseVisibilityGroups(item.audienceInput || "")
    };
    const updated = await fetchJSON(`/api/announcements/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    announcementsAdmin.value = announcementsAdmin.value.map((entry) =>
      entry.id === updated.id
        ? { ...updated, audienceInput: formatGroups(updated.audience_groups) }
        : entry
    );
    showToast(t("admin.content.updatedAnnouncement"), "success");
  } catch (err) {
    error.value = err.message || "Announcement update failed";
  }
};

const deleteAnnouncement = async (item) => {
  if (!confirm(t("admin.content.confirmDeleteAnnouncement", { title: item.title }))) return;
  try {
    await fetchJSON(`/api/announcements/${item.id}`, { method: "DELETE" });
    announcementsAdmin.value = announcementsAdmin.value.filter((entry) => entry.id !== item.id);
    showToast(t("admin.content.deletedAnnouncement"), "success");
  } catch (err) {
    error.value = err.message || "Announcement delete failed";
  }
};

const createDirectoryItem = async () => {
  if (!contentSpaceId.value) {
    error.value = t("admin.members.selectSpaceError");
    return;
  }
  try {
    const owners = parseJSONInputSafe(directoryForm.value.owners, {}, "Owners");
    const links = parseJSONInputSafe(directoryForm.value.links, {}, "Links");
    const endpoints = parseJSONInputSafe(directoryForm.value.endpoints, [], "Endpoints");
    const payload = {
      space_id: Number(contentSpaceId.value),
      title: directoryForm.value.title,
      description: directoryForm.value.description,
      icon_url: normalizeIconUrl(directoryForm.value.iconUrl),
      url: directoryForm.value.url,
      type: directoryForm.value.type,
      pinned: directoryForm.value.pinned,
      tags: parseCommaList(directoryForm.value.tags || ""),
      action_keys: parseCommaList(directoryForm.value.actionKeys || ""),
      audience_groups: parseVisibilityGroups(directoryForm.value.audienceGroups || ""),
      service_type: directoryForm.value.serviceType,
      owners,
      links,
      endpoints,
      tier: directoryForm.value.tier,
      lifecycle: directoryForm.value.lifecycle,
      access_path: directoryForm.value.accessPath,
      runbook_url: directoryForm.value.runbookUrl,
      classification: directoryForm.value.classification,
      depends_on: parseCommaList(directoryForm.value.dependsOn || "")
    };
    const created = await fetchJSON("/api/directory_items", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    directoryAdmin.value = [
      mapDirectoryItem(created),
      ...directoryAdmin.value
    ];
    directoryForm.value = {
      title: "",
      description: "",
      iconUrl: "",
      url: "",
      type: "resource",
      pinned: false,
      tags: "",
      actionKeys: "",
      audienceGroups: defaultAudienceForSpace(contentSpaceId.value),
      serviceType: "",
      owners: "",
      links: "",
      endpoints: "",
      tier: "",
      lifecycle: "",
      accessPath: "",
      runbookUrl: "",
      classification: "",
      dependsOn: ""
    };
    showToast(t("admin.content.createdDirectory"), "success");
  } catch (err) {
    error.value = err.message || "Directory create failed";
  }
};

const updateDirectoryItem = async (item) => {
  try {
    const owners = parseJSONInputSafe(item.ownersInput || "", {}, "Owners");
    const links = parseJSONInputSafe(item.linksInput || "", {}, "Links");
    const endpoints = parseJSONInputSafe(item.endpointsInput || "", [], "Endpoints");
    const payload = {
      title: item.title,
      description: item.description,
      icon_url: normalizeIconUrl(item.icon_url),
      url: item.url,
      type: item.type,
      key: item.key || "",
      pinned: item.pinned,
      tags: parseCommaList(item.tagsInput || ""),
      action_keys: parseCommaList(item.actionKeysInput || ""),
      audience_groups: parseVisibilityGroups(item.audienceInput || ""),
      service_type: item.serviceType || "",
      owners,
      links,
      endpoints,
      tier: item.tier || "",
      lifecycle: item.lifecycle || "",
      access_path: item.accessPath || "",
      runbook_url: item.runbookUrl || "",
      classification: item.classification || "",
      depends_on: parseCommaList(item.dependsOnInput || "")
    };
    const updated = await fetchJSON(`/api/directory_items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    directoryAdmin.value = directoryAdmin.value.map((entry) =>
      entry.id === updated.id
        ? mapDirectoryItem(updated)
        : entry
    );
    showToast(t("admin.content.updatedDirectory"), "success");
  } catch (err) {
    error.value = err.message || "Directory update failed";
  }
};

const deleteDirectoryItem = async (item) => {
  if (!confirm(t("admin.content.confirmDeleteDirectory", { title: item.title }))) return;
  try {
    await fetchJSON(`/api/directory_items/${item.id}`, { method: "DELETE" });
    directoryAdmin.value = directoryAdmin.value.filter((entry) => entry.id !== item.id);
    showToast(t("admin.content.deletedDirectory"), "success");
  } catch (err) {
    error.value = err.message || "Directory delete failed";
  }
};

const loadServices = async () => {
  try {
    const items = await fetchJSON("/api/services");
    servicesAdmin.value = items.map((item) => mapService(item));
    if (!placementForm.value.serviceKey && servicesAdmin.value.length > 0) {
      placementForm.value = {
        ...placementForm.value,
        serviceKey: servicesAdmin.value[0].key
      };
    }
  } catch (err) {
    error.value = err.message || "Services load failed";
  }
};

const createService = async () => {
  try {
    const owners = parseJSONInputSafe(serviceForm.value.owners, {}, "Owners");
    const links = parseJSONInputSafe(serviceForm.value.links, {}, "Links");
    const endpoints = parseJSONInputSafe(serviceForm.value.endpoints, [], "Endpoints");
    const payload = {
      key: serviceForm.value.key,
      title: serviceForm.value.title,
      description: serviceForm.value.description,
      icon_url: normalizeIconUrl(serviceForm.value.iconUrl),
      service_type: serviceForm.value.serviceType,
      tags: parseCommaList(serviceForm.value.tags || ""),
      owners,
      links,
      endpoints,
      tier: serviceForm.value.tier,
      lifecycle: serviceForm.value.lifecycle,
      classification: serviceForm.value.classification,
      depends_on: parseCommaList(serviceForm.value.dependsOn || "")
    };
    const created = await fetchJSON("/api/services", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    servicesAdmin.value = [mapService(created), ...servicesAdmin.value];
    serviceForm.value = {
      key: "",
      title: "",
      description: "",
      iconUrl: "",
      serviceType: "",
      tags: "",
      owners: "",
      links: "",
      endpoints: "",
      tier: "",
      lifecycle: "",
      classification: "",
      dependsOn: ""
    };
    showToast(t("admin.services.created"), "success");
  } catch (err) {
    showToast(err.message || "Service create failed", "error");
  }
};

const openServiceEdit = (item) => {
  serviceEditItem.value = { ...item };
};

const closeServiceEdit = () => {
  serviceEditItem.value = null;
};

const updateService = async (item) => {
  try {
    const owners = parseJSONInputSafe(item.ownersInput || "", {}, "Owners");
    const links = parseJSONInputSafe(item.linksInput || "", {}, "Links");
    const endpoints = parseJSONInputSafe(item.endpointsInput || "", [], "Endpoints");
    const payload = {
      key: item.key,
      title: item.title,
      description: item.description,
      icon_url: normalizeIconUrl(item.iconUrl),
      service_type: item.serviceType || "",
      tags: parseCommaList(item.tagsInput || ""),
      owners,
      links,
      endpoints,
      tier: item.tier || "",
      lifecycle: item.lifecycle || "",
      classification: item.classification || "",
      depends_on: parseCommaList(item.dependsOnInput || "")
    };
    const updated = await fetchJSON(`/api/services/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    servicesAdmin.value = servicesAdmin.value.map((entry) =>
      entry.id === updated.id
        ? mapService(updated)
        : entry
    );
    serviceEditItem.value = null;
    showToast(t("admin.services.updated"), "success");
  } catch (err) {
    showToast(err.message || "Service update failed", "error");
  }
};

const deleteService = async (item) => {
  if (!confirm(t("admin.services.confirmDelete", { title: item.title }))) return;
  try {
    await fetchJSON(`/api/services/${item.id}`, { method: "DELETE" });
    servicesAdmin.value = servicesAdmin.value.filter((entry) => entry.id !== item.id);
    showToast(t("admin.services.deleted"), "success");
  } catch (err) {
    showToast(err.message || "Service delete failed", "error");
  }
};

const loadPlacements = async () => {
  try {
    const params = new URLSearchParams();
    if (placementSpaceId.value) params.set("space_id", placementSpaceId.value);
    if (placementServiceKey.value) params.set("service_key", placementServiceKey.value);
    const query = params.toString();
    const items = await fetchJSON(`/api/service_placements${query ? `?${query}` : ""}`);
    placementsAdmin.value = items.map((item) => mapPlacement(item));
  } catch (err) {
    error.value = err.message || "Placements load failed";
  }
};

const createPlacement = async () => {
  if (!placementForm.value.spaceId) {
    showToast(t("admin.placements.selectSpaceError"), "error");
    return;
  }
  if (!placementForm.value.serviceKey) {
    showToast(t("admin.placements.selectServiceError"), "error");
    return;
  }
  try {
    const payload = {
      service_key: placementForm.value.serviceKey,
      space_id: Number(placementForm.value.spaceId),
      label: placementForm.value.label,
      pinned: placementForm.value.pinned,
      order: Number(placementForm.value.order) || 0,
      group: placementForm.value.group,
      audience_groups: parseCommaList(placementForm.value.audienceGroups || ""),
      allowed_actions: parseCommaList(placementForm.value.allowedActions || ""),
      visible_links: parseCommaList(placementForm.value.visibleLinks || ""),
      primary_url: placementForm.value.primaryUrl,
      default_endpoint: placementForm.value.defaultEndpoint,
      access_path: placementForm.value.accessPath
    };
    const created = await fetchJSON("/api/service_placements", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    placementsAdmin.value = [mapPlacement(created), ...placementsAdmin.value];
    placementForm.value = {
      ...placementForm.value,
      label: "",
      pinned: false,
      order: 0,
      group: "",
      audienceGroups: "",
      allowedActions: "",
      visibleLinks: "",
      primaryUrl: "",
      defaultEndpoint: "",
      accessPath: ""
    };
    showToast(t("admin.placements.created"), "success");
  } catch (err) {
    showToast(err.message || "Placement create failed", "error");
  }
};

const updatePlacement = async (item) => {
  try {
    const payload = {
      service_key: item.service_key,
      space_id: Number(item.space_id),
      label: item.label,
      pinned: item.pinned,
      order: Number(item.order) || 0,
      group: item.group || "",
      audience_groups: parseCommaList(item.audienceInput || ""),
      allowed_actions: parseCommaList(item.allowedActionsInput || ""),
      visible_links: parseCommaList(item.visibleLinksInput || ""),
      primary_url: item.primary_url,
      default_endpoint: item.default_endpoint,
      access_path: item.access_path
    };
    const updated = await fetchJSON(`/api/service_placements/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    placementsAdmin.value = placementsAdmin.value.map((entry) =>
      entry.id === updated.id
        ? mapPlacement(updated)
        : entry
    );
    showToast(t("admin.placements.updated"), "success");
  } catch (err) {
    showToast(err.message || "Placement update failed", "error");
  }
};

const deletePlacement = async (item) => {
  if (!confirm(t("admin.placements.confirmDelete", { key: item.service_key }))) return;
  try {
    await fetchJSON(`/api/service_placements/${item.id}`, { method: "DELETE" });
    placementsAdmin.value = placementsAdmin.value.filter((entry) => entry.id !== item.id);
    showToast(t("admin.placements.deleted"), "success");
  } catch (err) {
    showToast(err.message || "Placement delete failed", "error");
  }
};

const ensurePlacementDefaults = () => {
  if (!placementSpaceId.value && spacesAdmin.value.length > 0) {
    placementSpaceId.value = String(spacesAdmin.value[0].id);
  }
  if (!placementForm.value.spaceId && placementSpaceId.value) {
    placementForm.value = { ...placementForm.value, spaceId: placementSpaceId.value };
  }
  if (!placementForm.value.serviceKey && servicesAdmin.value.length > 0) {
    placementForm.value = { ...placementForm.value, serviceKey: servicesAdmin.value[0].key };
  }
};


const loadDashboardPreview = async (space, roleOverride) => {
  if (!space?.id || !hasDashboard(space)) return;
  const blocks = blocksForSpace(space.id);
  const ids = blocks.map((block) => block.id).filter(Boolean);
  if (ids.length === 0) return;
  const params = new URLSearchParams({ ids: ids.join(",") });
  const types = blocks.map((block) => block.type).filter(Boolean);
  if (types.length > 0) {
    params.set("types", types.join(","));
  }
  if (roleOverride && roleOverride !== "admin") {
    params.set("audience", roleOverride);
  }
  try {
    const data = await fetchJSON(`/api/spaces/${space.database_id}/blocks/data?${params.toString()}`);
    dashboardData.value = { ...dashboardData.value, [space.id]: data };
  } catch (err) {
    console.error("Failed to load preview data:", err);
  }
};

const onPreviewRoleChange = async () => {
  if (!dashboardEditorSpace.value) return;
  await loadDashboardPreview(dashboardEditorSpace.value, dashboardPreviewRole.value);
};

const createSpace = async () => {
  try {
    const displayConfig = JSON.parse(newSpace.value.displayConfig || "{}");
    const personalizationRules = JSON.parse(newSpace.value.personalizationRules || "{}");
    if (newSpace.value.description) {
      displayConfig.description = newSpace.value.description;
    } else {
      delete displayConfig.description;
    }
    const parentId = Number(newSpace.value.parentId) || null;
    const dashboardTemplateId = Number(newSpace.value.dashboardTemplateId) || null;
    const visibilityGroups = parseVisibilityGroups(newSpace.value.visibilityGroups || "");
    const payload = {
      title: newSpace.value.title,
      slug: newSpace.value.slug,
      type: newSpace.value.type,
      parent_id: parentId,
      dashboard_template_id: dashboardTemplateId,
      access_mode: newSpace.value.accessMode || "private",
      is_default_public_entry:
        (newSpace.value.accessMode || "private") === "public_readonly" &&
        !!newSpace.value.isDefaultPublicEntry,
      layout_mode: newSpace.value.layoutMode,
      background_url: newSpace.value.backgroundUrl,
      is_lockable: newSpace.value.isLockable,
      visibility_groups: visibilityGroups,
      display_config: displayConfig,
      personalization_rules: personalizationRules,
      public_entry: buildPublicEntry(newSpace.value)
    };
    await fetchJSON("/api/spaces", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    await reloadAdminSpaces();
    await refreshAdminDataAfterSpaceChange();
    newSpace.value = {
      title: "",
      slug: "",
      type: "audience",
      parentId: "",
      dashboardTemplateId: "",
      visibilityGroups: "",
      layoutMode: "grid",
      backgroundUrl: "",
      isLockable: true,
      accessMode: "private",
      isDefaultPublicEntry: false,
      publicEntryTitle: "",
      publicEntrySubtitle: "",
      publicEntryHelp: "",
      publicEntryContact: "",
      description: "",
      displayConfig: "{}",
      personalizationRules: "{}"
    };
  } catch (err) {
    error.value = err.message || "Space create failed";
  }
};

const startEditSpace = (space) => {
  const description = space?.display_config?.description || "";
  editSpace.value = {
    ...space,
    type: space?.type || "audience",
    parentId: space?.parent_id ? String(space.parent_id) : "",
    dashboardTemplateId: space?.dashboard_template_id ? String(space.dashboard_template_id) : "",
    visibilityGroups: Array.isArray(space?.visibility_groups)
      ? space.visibility_groups.join(", ")
      : "",
    layoutMode: space.layout_mode || "grid",
    backgroundUrl: space.background_url || "",
    isLockable: space.is_lockable ?? true,
    accessMode: space.access_mode || "private",
    isDefaultPublicEntry: !!space.is_default_public_entry,
    description
  };
  const publicEntry = spacePublicEntry(space);
  editSpace.value.publicEntryTitle = publicEntry?.title || "";
  editSpace.value.publicEntrySubtitle = publicEntry?.subtitle || "";
  editSpace.value.publicEntryHelp = publicEntry?.help || "";
  editSpace.value.publicEntryContact = publicEntry?.contact || "";
  editDisplayConfig.value = JSON.stringify(space.display_config || {}, null, 2);
  editPersonalizationRules.value = JSON.stringify(space.personalization_rules || {}, null, 2);
};

const updateSpace = async () => {
  try {
    const displayConfig = JSON.parse(editDisplayConfig.value || "{}");
    const personalizationRules = JSON.parse(editPersonalizationRules.value || "{}");
    if (editSpace.value.description) {
      displayConfig.description = editSpace.value.description;
    } else {
      delete displayConfig.description;
    }
    const parentId = Number(editSpace.value.parentId) || null;
    const dashboardTemplateId = Number(editSpace.value.dashboardTemplateId) || null;
    const visibilityGroups = parseVisibilityGroups(editSpace.value.visibilityGroups || "");
    const payload = {
      title: editSpace.value.title,
      slug: editSpace.value.slug,
      type: editSpace.value.type,
      parent_id: parentId,
      dashboard_template_id: dashboardTemplateId,
      access_mode: editSpace.value.accessMode || "private",
      is_default_public_entry:
        (editSpace.value.accessMode || "private") === "public_readonly" &&
        !!editSpace.value.isDefaultPublicEntry,
      layout_mode: editSpace.value.layoutMode || "grid",
      background_url: editSpace.value.backgroundUrl || "",
      is_lockable: editSpace.value.isLockable ?? true,
      visibility_groups: visibilityGroups,
      display_config: displayConfig,
      personalization_rules: personalizationRules,
      public_entry: buildPublicEntry(editSpace.value)
    };
    await fetchJSON(`/api/spaces/${editSpace.value.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    await reloadAdminSpaces();
    await refreshAdminDataAfterSpaceChange();
    editSpace.value = null;
    editDisplayConfig.value = "";
    editPersonalizationRules.value = "";
  } catch (err) {
    error.value = err.message || "Space update failed";
  }
};

const deleteSpace = async (space) => {
  if (!confirm(t("admin.spaces.confirmDelete", { title: space.title }))) {
    return;
  }
  try {
    await fetchJSON(`/api/spaces/${space.id}`, {
      method: "DELETE"
    });
    await reloadAdminSpaces();
    await refreshAdminDataAfterSpaceChange();
  } catch (err) {
    error.value = err.message || "Space delete failed";
  }
};

const archiveSpace = async (space) => {
  if (!confirm(t("admin.spaces.confirmArchive", { title: space.title }))) {
    return;
  }
  try {
    await fetchJSON(`/api/spaces/${space.id}/archive`, {
      method: "POST"
    });
    await reloadAdminSpaces();
    await refreshAdminDataAfterSpaceChange();
    showToast(t("admin.spaces.archivedDone"), "success");
  } catch (err) {
    error.value = err.message || "Space archive failed";
  }
};

const restoreSpace = async (space) => {
  if (!confirm(t("admin.spaces.confirmRestore", { title: space.title }))) {
    return;
  }
  try {
    await fetchJSON(`/api/spaces/${space.id}/restore`, {
      method: "POST"
    });
    await reloadAdminSpaces();
    await refreshAdminDataAfterSpaceChange();
    showToast(t("admin.spaces.restoredDone"), "success");
  } catch (err) {
    error.value = err.message || "Space restore failed";
  }
};

const userInitials = computed(() => {
  if (!me.value?.email) return "?";
  const parts = me.value.email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return me.value.email.slice(0, 2).toUpperCase();
});

const logout = async () => {
  try {
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
    window.location.reload();
  } catch (err) {
    error.value = t("auth.logoutFailed");
  }
};

const parseDisplayConfig = (space) => {
  const raw = space?.display_config;
  if (!raw) return {};
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
};

const currentSpace = computed(() => spaces.value[currentIndex.value] || null);
const hasPublicSpaces = computed(() => spaces.value.some((space) => isPublicReadonlySpace(space)));
const guestFocusSpace = computed(() => {
  if (spaces.value.length === 0) return null;
  return spaces.value.find((space) => space.is_default_public_entry) || spaces.value[0] || null;
});
const isKioskMode = computed(() => {
  const cfg = parseDisplayConfig(currentSpace.value);
  return cfg.kiosk === true;
});
const prevSpace = computed(() => {
  const idx = currentIndex.value - 1;
  if (idx < 0) return null;
  return spaces.value[idx] || null;
});
const nextSpace = computed(() => {
  const idx = currentIndex.value + 1;
  if (idx >= spaces.value.length) return null;
  return spaces.value[idx] || null;
});
const hasPrevSpaces = computed(() => currentIndex.value > 0);
const hasNextSpaces = computed(() => currentIndex.value + 1 < spaces.value.length);
const settingsStore = {
  getJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage errors
    }
  }
};

const normalizeLang = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const base = raw.split(/[_-]/)[0];
  return ["en", "ru"].includes(base) ? base : "";
};

const languageLabels = {
  en: "English",
  ru: "Русский"
};

const supportedLangs = computed(() => {
  const cfg = parseDisplayConfig(currentSpace.value);
  const raw = Array.isArray(cfg.supported_langs) ? cfg.supported_langs : [];
  const normalized = raw.map(normalizeLang).filter(Boolean);
  if (normalized.length > 0) return [...new Set(normalized)];
  return ["en", "ru"];
});

const languageSwitcherMode = computed(() => {
  const cfg = parseDisplayConfig(currentSpace.value);
  const mode = typeof cfg.language_switcher === "string" ? cfg.language_switcher : "";
  if (["off", "header", "settings"].includes(mode)) return mode;
  if (isKioskMode.value) return "off";
  if (!authEnabled.value || !me.value || actualRole.value === "guest") return "header";
  return "settings";
});

const languageSwitcherVisible = computed(
  () => supportedLangs.value.length > 1 && languageSwitcherMode.value !== "off"
);

const currentLang = ref(FALLBACK_LANG);
const getLangFromUrl = () => normalizeLang(new URLSearchParams(window.location.search).get("lang"));
const getStoredLang = () => normalizeLang(settingsStore.getJSON(LANG_STORAGE_KEY, ""));
const getSpaceDefaultLang = () => normalizeLang(parseDisplayConfig(currentSpace.value).default_lang);
const resolveLang = () => {
  const supported = supportedLangs.value;
  const isSupported = (value) => value && supported.includes(value);
  const candidates = [
    getLangFromUrl(),
    getStoredLang(),
    getSpaceDefaultLang()
  ];
  for (const candidate of candidates) {
    if (isSupported(candidate)) return candidate;
  }
  if (supported.includes(FALLBACK_LANG)) return FALLBACK_LANG;
  return supported[0] || FALLBACK_LANG;
};

const setLang = (lang, persist = true) => {
  const normalized = normalizeLang(lang);
  if (!normalized) return;
  if (!supportedLangs.value.includes(normalized)) return;
  currentLang.value = normalized;
  if (persist) settingsStore.setJSON(LANG_STORAGE_KEY, normalized);
};

const languageSelection = computed({
  get() {
    return currentLang.value;
  },
  set(value) {
    setLang(value, true);
  }
});

const syncLangFromContext = () => {
  const resolved = resolveLang();
  if (currentLang.value !== resolved) {
    currentLang.value = resolved;
  }
};

const t = (key, vars = {}) => {
  const messages = MESSAGES[currentLang.value] || MESSAGES[FALLBACK_LANG] || {};
  const fallback = MESSAGES[FALLBACK_LANG] || {};
  const template = messages[key] || fallback[key] || key;
  return template.replace(/\{(\w+)\}/g, (match, varKey) => {
    if (Object.prototype.hasOwnProperty.call(vars, varKey)) {
      return String(vars[varKey]);
    }
    return match;
  });
};

const syncRoleOverride = () => {
  if (roleOverrideReady.value) return;
  if (!actualIsAdmin.value) {
    roleOverride.value = "";
    settingsStore.setJSON(roleOverrideKey, "");
    roleOverrideReady.value = true;
    return;
  }
  const stored = settingsStore.getJSON(roleOverrideKey, "");
  const normalized = typeof stored === "string" ? stored.trim() : "";
  if (!normalized || normalized === actualRole.value || normalized === "admin") {
    roleOverride.value = "";
  } else {
    roleOverride.value = normalized;
  }
  if (roleOverride.value && window.location.pathname.startsWith("/admin")) {
    navigateHome();
  }
  roleOverrideReady.value = true;
};

const applyRoleOverride = async (nextRole) => {
  const normalized = String(nextRole || "").trim();
  const next =
    actualIsAdmin.value &&
    normalized &&
    normalized !== actualRole.value &&
    normalized !== "admin"
      ? normalized
      : "";
  if (roleOverride.value === next) return;
  roleOverride.value = next;
  settingsStore.setJSON(roleOverrideKey, next);
  showUserDropdown.value = false;
  dashboards.value = {};
  dashboardData.value = {};
  if (showAdmin.value && !isAdmin.value) {
    navigateHome();
  }
  await loadAll();
};

const roleOptions = computed(() => {
  const defaults = ["guest", "user", "admin"];
  const roleKeys = Array.isArray(roles.value)
    ? roles.value.map((role) => role.key).filter(Boolean)
    : [];
  const next = [...new Set([...roleKeys, ...defaults])];
  return next.sort((a, b) => a.localeCompare(b));
});

const roleOverrideSelection = computed({
  get() {
    return roleOverride.value || actualRole.value || "guest";
  },
  set(value) {
    applyRoleOverride(value);
  }
});

const spaceIconLabel = (space) => {
  if (!space) return "•";
  const icon = space?.display_config?.icon;
  if (icon) return icon;
  const title = String(space.title || "").trim();
  return title ? title[0].toUpperCase() : "•";
};

const spaceMetaLabel = (space) => {
  const type = space?.type ? String(space.type) : "";
  const desc = spaceDescription(space);
  if (type && desc) return `${type} • ${desc}`;
  return type || desc || "";
};

const spaceRouteSlug = (space) => {
  if (!space) return "";
  const explicit = space?.display_config?.url;
  if (explicit) return String(explicit);
  return String(space?.slug || space?.id || "");
};

watch(
  () => currentSpace.value,
  (space) => {
    const slug = spaceRouteSlug(space);
    if (!slug) return;
    lastSpaceSlug.value = slug;
    settingsStore.setJSON(lastSpaceSlugKey, slug);
  }
);

const resourceInitial = (item) => {
  const title = String(item?.title || "").trim();
  return title ? title[0].toUpperCase() : "•";
};

const isInteractiveTarget = (target) => {
  if (!target) return false;
  const interactive = ["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT", "LABEL"];
  if (interactive.includes(target.tagName)) return true;
  return !!target.closest("a,button,input,textarea,select,label");
};

const viewerKeyForResource = (item) => {
  if (!item) return "";
  if (item.viewer_key) return String(item.viewer_key);
  if (item.type === "service" && item.service_type) {
    return `service.${String(item.service_type).toLowerCase()}`;
  }
  if (item.type === "service") return "service.default";
  return "";
};

const canOpenResourceDetails = (item) => {
  if (!item) return false;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const wantsDetails = tags.some((tag) => {
    const value = String(tag || "").toLowerCase();
    return value === "details" || value === "details:enabled";
  });
  if (item.viewer_key) return true;
  return wantsDetails;
};

const resourcePopoverOpen = ref(false);
const resourcePopoverItem = ref(null);
const resourcePopoverViewer = computed(() => viewerKeyForResource(resourcePopoverItem.value));
const resourcePopoverPlacement = ref("left");
const resourcePopoverAnchor = ref(null);
const userMenuRef = ref(null);

const closeResourcePopover = () => {
  resourcePopoverOpen.value = false;
  resourcePopoverItem.value = null;
  resourcePopoverAnchor.value = null;
};

const updateResourcePopoverPlacement = (anchor) => {
  if (!anchor || typeof window === "undefined") return;
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth || 0;
  const popoverWidth = Math.min(rect.width + 280, Math.max(0, viewportWidth - 24));
  const spaceRight = viewportWidth - rect.left;
  const spaceLeft = rect.right;

  let placement = "left";
  if (popoverWidth <= spaceRight) {
    placement = "left";
  } else if (popoverWidth <= spaceLeft) {
    placement = "right";
  } else {
    placement = spaceRight >= spaceLeft ? "left" : "right";
  }
  resourcePopoverPlacement.value = placement;
};

const handleGlobalClick = (event) => {
  if (showUserDropdown.value && userMenuRef.value) {
    const target = event?.target;
    if (!target || !userMenuRef.value.contains(target)) {
      showUserDropdown.value = false;
    }
  }
  if (!resourcePopoverOpen.value || !resourcePopoverItem.value) return;
  const target = event?.target;
  if (!target?.closest) return;
  const card = target.closest(".resource-card");
  const activeId = String(resourcePopoverItem.value.id || "");
  if (!card) {
    closeResourcePopover();
    return;
  }
  const cardId = card.getAttribute("data-resource-id") || "";
  if (cardId !== activeId) {
    closeResourcePopover();
  }
};

const openResourcePopover = (item, anchor) => {
  resourcePopoverItem.value = item;
  resourcePopoverOpen.value = true;
  resourcePopoverAnchor.value = anchor || null;
  updateResourcePopoverPlacement(resourcePopoverAnchor.value);
};

const toggleResourcePopover = (event, item) => {
  if (!item || !canOpenResourceDetails(item)) return;
  if (resourcePopoverOpen.value && resourcePopoverItem.value?.id === item.id) {
    closeResourcePopover();
    return;
  }
  const anchor = event?.target?.closest?.(".resource-card") || null;
  openResourcePopover(item, anchor);
};

const normalizeActionKeys = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
};

const serviceBadges = (item) => {
  const badges = [];
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  const envTag = tags.find((tag) => {
    const value = String(tag || "").toLowerCase();
    if (!value) return false;
    if (value.startsWith("env:") || value.startsWith("env=")) return true;
    return ["prod", "production", "staging", "stage", "dev", "test", "qa"].includes(value);
  });
  if (envTag) badges.push(envTag);
  if (item?.tier) badges.push(item.tier);
  return badges.slice(0, 2);
};

const serviceOwnerLine = (item) => {
  const owners = item?.owners || {};
  const owner =
    owners.team ||
    owners.primary ||
    owners.owner ||
    "";
  const oncall = owners.oncall || "";
  if (owner && oncall) return `Owner: ${owner} • On-call: ${oncall}`;
  if (owner) return `Owner: ${owner}`;
  if (oncall) return `On-call: ${oncall}`;
  return "";
};

const serviceStatusLabel = (item) => {
  const status = item?.status || item?.health_status;
  if (!status) return "";
  return String(status);
};

const normalizeLinks = (links) => {
  const result = [];
  if (!links || typeof links !== "object") return result;
  const keys = ["docs", "runbook", "repo", "dashboards", "logs", "traces", "console"];
  for (const key of keys) {
    const value = links[key];
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) result.push({ label: key, url: String(entry) });
      }
    } else {
      result.push({ label: key, url: String(value) });
    }
  }
  return result;
};

const formatEndpointLine = (endpoint) => {
  if (!endpoint || typeof endpoint !== "object") return "";
  const type = String(endpoint.type || "").toLowerCase();
  if (type === "http" && endpoint.url) return endpoint.url;
  if (type === "s3") {
    const bucket = endpoint.bucket ? `s3://${endpoint.bucket}` : "";
    const region = endpoint.region ? ` (${endpoint.region})` : "";
    return `${bucket}${region}`.trim();
  }
  if (type === "postgres") {
    const host = endpoint.host || endpoint.hostname || "";
    const port = endpoint.port ? `:${endpoint.port}` : "";
    return `${host}${port}`.trim();
  }
  if (endpoint.url) return String(endpoint.url);
  if (endpoint.endpoint) return String(endpoint.endpoint);
  return "";
};

const s3EndpointsFor = (item) => {
  const endpoints = Array.isArray(item?.endpoints) ? item.endpoints : [];
  const filtered = endpoints.filter((endpoint) => {
    const value = String(endpoint?.type || "").toLowerCase();
    return value === "s3";
  });
  return filtered.length ? filtered : endpoints;
};

const copyText = async (value) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(String(value));
    showToast(t("resource.copied"), "success");
  } catch {
    showToast(t("resource.copyFailed"), "error");
  }
};

const actionLabel = (key) => {
  const value = String(key || "").trim();
  if (!value) return "";
  const last = value.split(".").pop() || value;
  return last
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
};

const invokeServiceAction = async (actionKey, item) => {
  if (!actionKey) return;
  const itemSpace = spaces.value.find((space) => Number(space.database_id) === Number(item?.space_id));
  if (isPublicReadonlySpace(itemSpace)) {
    showToast(t("resource.publicReadonly"), "error");
    return;
  }
  try {
    await fetchJSON(withRoleOverride("/api/actions/invoke"), {
      method: "POST",
      body: JSON.stringify({
        action_key: actionKey,
        space_id: item?.space_id,
        params: {
          service_key: item?.key,
          directory_item_id: item?.id
        }
      })
    });
    showToast(t("resource.actionInvoked"), "success");
  } catch (err) {
    showToast(err.message || t("resource.actionFailed"), "error");
  }
};

const recentResourcesForSpace = (space) => {
  const key = String(space?.id || "");
  const items = recentResourcesBySpace.value[key];
  return Array.isArray(items) ? items : [];
};

const rememberResourceVisit = (space, item) => {
  const spaceId = String(space?.id || item?.space_id || "");
  const title = String(item?.title || "").trim();
  const url = String(item?.url || "").trim();
  if (!spaceId || !title || !url) return;
  const entry = {
    id: String(item?.id || title),
    title,
    url
  };
  const current = Array.isArray(recentResourcesBySpace.value[spaceId])
    ? recentResourcesBySpace.value[spaceId]
    : [];
  const next = [entry, ...current.filter((value) => value.id !== entry.id)].slice(0, 4);
  recentResourcesBySpace.value = {
    ...recentResourcesBySpace.value,
    [spaceId]: next
  };
  settingsStore.setJSON(recentResourcesKey, recentResourcesBySpace.value);
};

const resourceEntriesForSpace = (space) => {
  if (!space?.id) return [];
  const blocks = blocksForSpace(space.id).filter((block) =>
    blockTypeIs(block, BLOCK_TYPES.resourcesPinned)
  );
  const items = [];
  for (const block of blocks) {
    const data = blockDataFor(space.id, block.id);
    if (Array.isArray(data)) {
      items.push(...data);
    }
  }
  return items;
};

const firstResourceForSpace = (space, matcher) =>
  resourceEntriesForSpace(space).find((item) => matcher(String(item?.title || "").toLowerCase(), item));

const adminAttentionCount = (space) =>
  resourceEntriesForSpace(space).filter((item) => {
    const status = String(item?.status || item?.health_status || "").toLowerCase();
    return ["degraded", "offline", "error", "down"].some((value) => status.includes(value));
  }).length;

const surfaceCardsFor = (space) => {
  if (!space) return [];
  const resources = resourceEntriesForSpace(space);
  if (isAdminSpace(space)) {
    return [];
  }
  if (isKidsSpace(space)) {
    const safeResources = resources.slice(0, 3).map((item) => item.title);
    return [
      {
        id: "kids-safe",
        eyebrow: t("surface.kids.safeTitle"),
        title: t("surface.state.ready"),
        body: t("surface.kids.safeBody")
      },
      {
        id: "kids-allowed",
        eyebrow: t("surface.kids.allowedTitle"),
        title: safeResources.length ? safeResources.join(" · ") : t("surface.state.ready"),
        body: safeResources.length ? t("surface.kids.allowedBody") : t("surface.kids.allowedBody")
      },
      {
        id: "kids-help",
        eyebrow: t("surface.kids.helpTitle"),
        title: t("surface.state.guided"),
        body: t("surface.kids.helpBody")
      }
    ];
  }
  return [];
};

const surfaceHeadingFor = (space) => {
  if (!space) return { title: "", subtitle: "" };
  if (isAdminSpace(space)) {
    return {
      title: t("surface.admin.title"),
      subtitle: t("surface.admin.subtitle")
    };
  }
  if (isKidsSpace(space)) {
    return {
      title: t("surface.kids.title"),
      subtitle: t("surface.kids.subtitle")
    };
  }
  return { title: "", subtitle: "" };
};

const runSurfaceAction = (card) => {
  if (!card?.actionKind || !card?.actionTarget) return;
  if (card.actionKind === "url") {
    window.open(card.actionTarget, "_blank", "noopener,noreferrer");
    return;
  }
  if (card.actionKind === "admin-tab") {
    navigateToAdmin(card.actionTarget);
  }
};

const updateRecentSpaces = (spaceId) => {
  const id = String(spaceId || "");
  if (!id) return;
  const next = [id, ...recentSpaceIds.value.filter((item) => item !== id)];
  recentSpaceIds.value = next.slice(0, 5);
  settingsStore.setJSON(recentSpacesKey, recentSpaceIds.value);
};

const isPinnedSpace = (spaceId) =>
  pinnedSpaceIds.value.includes(String(spaceId));

const togglePinnedSpace = (spaceId) => {
  const id = String(spaceId || "");
  if (!id) return;
  const next = isPinnedSpace(id)
    ? pinnedSpaceIds.value.filter((item) => item !== id)
    : [...pinnedSpaceIds.value, id];
  pinnedSpaceIds.value = next;
  settingsStore.setJSON(pinnedSpacesKey, next);
};

const matchesSpaceQuery = (space, query) => {
  const value = String(query || "").trim().toLowerCase();
  if (!value) return true;
  const hay = [
    space?.title,
    space?.slug,
    space?.description,
    space?.display_config?.description
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(value);
};

const filteredSpaces = computed(() =>
  spaces.value.filter((space) => matchesSpaceQuery(space, spaceQuery.value))
);

const spacesFromIds = (ids) => {
  const map = new Map(spaces.value.map((space) => [String(space.id), space]));
  return ids.map((id) => map.get(String(id))).filter(Boolean);
};

const spacePickerSections = computed(() => {
  if (spaces.value.length === 0) return [];
  const query = spaceQuery.value.trim();
  if (query) {
    return [{ label: "space.picker.results", items: filteredSpaces.value }];
  }
  const recents = spacesFromIds(recentSpaceIds.value);
  const pinned = spacesFromIds(pinnedSpaceIds.value);
  const seen = new Set([...recents, ...pinned].map((space) => String(space.id)));
  const all = spaces.value.filter((space) => !seen.has(String(space.id)));
  const sections = [];
  if (recents.length) sections.push({ label: "space.picker.recents", items: recents });
  if (pinned.length) sections.push({ label: "space.picker.pinned", items: pinned });
  sections.push({ label: "space.picker.all", items: all });
  return sections;
});

const toggleSpacePicker = () => {
  if (isKioskMode.value || spaces.value.length <= 1) return;
  spacePickerOpen.value = !spacePickerOpen.value;
  if (spacePickerOpen.value) {
    spaceQuery.value = "";
  }
};

const closeSpacePicker = () => {
  spacePickerOpen.value = false;
};

const selectSpace = (space) => {
  if (!space) return;
  const idx = spaces.value.findIndex((item) => item.id === space.id);
  if (idx >= 0) {
  }
  if (idx >= 0) {
    scrollToIndex(idx, true);
  }
  closeSpacePicker();
};
const widgetHtml = (content) => {
  if (!content) return "";
  return marked.parse(content);
};

const priorityLabel = (priority) => {
  const map = {
    critical: "Критично",
    high: "Высокий",
    normal: "Обычный"
  };
  return map[priority] || "Обычный";
};

const priorityChipClass = (priority) => {
  if (priority === "critical") return "chip-critical";
  if (priority === "high") return "chip-warning";
  return "chip";
};

const requestStatusChipClass = (status) => {
  const value = String(status || "").toLowerCase();
  if (value.includes("работ")) return "chip-warning";
  if (value.includes("ожид")) return "chip";
  if (value.includes("подтверж")) return "chip-online";
  return "chip";
};

const isKidsSpace = (space) => space?.id === "kids" || space?.id === "home-kids" || space?.slug === "home-kids";
const isAdminSpace = (space) => space?.id === "admin" || space?.id === "home-admin" || space?.slug === "home-admin";

const isPublicReadonlySpace = (space) => String(space?.access_mode || "").toLowerCase() === "public_readonly";

const spacePublicEntry = (space) => {
  const raw = space?.public_entry;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const spaceDescription = (space) => {
  const publicEntry = spacePublicEntry(space);
  if (publicEntry?.subtitle) return String(publicEntry.subtitle);
  if (space?.description) return space.description;
  return "";
};

const spacePublicTitle = (space) => {
  const publicEntry = spacePublicEntry(space);
  if (publicEntry?.title) return String(publicEntry.title);
  return space?.title || "";
};

const spacePublicHelp = (space) => {
  const publicEntry = spacePublicEntry(space);
  if (publicEntry?.help) return String(publicEntry.help);
  if (publicEntry?.contact) return String(publicEntry.contact);
  return "";
};

const AUTO_PERF_CACHE_KEY = "atrium:auto-perf";
const PERFORMANCE_PREF_KEY = "atrium:performance";
const performancePreference = ref("auto");

const detectAutoPerformance = () => {
  try {
    const cached = settingsStore.getJSON(AUTO_PERF_CACHE_KEY, "");
    if (cached === "low" || cached === "normal") return cached;
  } catch {
    // ignore cache failures
  }

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReducedMotion) {
    settingsStore.setJSON(AUTO_PERF_CACHE_KEY, "low");
    return "low";
  }

  const cores = Number(navigator.hardwareConcurrency || 0);
  const memory = Number(navigator.deviceMemory || 0);
  const isLow = (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);
  const mode = isLow ? "low" : "normal";
  settingsStore.setJSON(AUTO_PERF_CACHE_KEY, mode);
  return mode;
};

const performanceMode = computed(() => {
  const cfg = parseDisplayConfig(currentSpace.value);
  const mode = String(cfg.performance_mode || "").toLowerCase();
  if (mode === "low") return "low";
  if (mode === "normal") return "normal";
  if (performancePreference.value === "low") return "low";
  if (performancePreference.value === "normal") return "normal";
  if (typeof window === "undefined") return "normal";
  return detectAutoPerformance();
});

const tooltipsDisabled = computed(() => performanceMode.value === "low");
const tooltipDelay = computed(() => (performanceMode.value === "low" ? 0 : 60));

const performanceSelectorVisible = computed(() => {
  const cfg = parseDisplayConfig(currentSpace.value);
  const mode = String(cfg.performance_mode || "").toLowerCase();
  if (mode === "low" || mode === "normal") return false;
  return !!me.value && !isKioskMode.value;
});

const performanceSelection = computed({
  get() {
    return performancePreference.value;
  },
  set(value) {
    const normalized = String(value || "").toLowerCase();
    const next = ["auto", "low", "normal"].includes(normalized) ? normalized : "auto";
    performancePreference.value = next;
    settingsStore.setJSON(PERFORMANCE_PREF_KEY, next);
  }
});

watch(
  () => performanceMode.value,
  (mode) => {
    if (typeof document === "undefined") return;
    document.body.dataset.performance = mode;
  },
  { immediate: true }
);

const toast = ref({ message: "", type: "" });
let toastTimer = null;

const showToast = (message, type = "info") => {
  toast.value = { message, type };
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    toast.value = { message: "", type: "" };
  }, 3500);
};


const updateViewport = () => {
  isMobile.value = window.matchMedia("(max-width: 768px)").matches;
  if (resourcePopoverOpen.value && resourcePopoverAnchor.value) {
    updateResourcePopoverPlacement(resourcePopoverAnchor.value);
  }
};

const normalizeBlockType = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return BLOCK_TYPES.resourcesPinned;
  if (raw === "resources_pinned") return BLOCK_TYPES.resourcesPinned;
  if (raw === "text") return BLOCK_TYPES.text;
  if (raw === "core.text") return BLOCK_TYPES.text;
  if (raw.startsWith("core.") || raw.startsWith("plugin.")) return raw;
  return raw;
};

const defaultBlockConfig = (type) => {
  switch (normalizeBlockType(type)) {
    case BLOCK_TYPES.resourcesPinned:
      return { limit: 12, scope: "this", filter: "pinned" };
    case BLOCK_TYPES.text:
      return { text: "", scope: "this", filter: "" };
    default:
      return { limit: 8, scope: "this", filter: "" };
  }
};

const normalizeBlockLayout = (block, index = 0) => {
  const legacyX = Number(block?.x || 1);
  const legacyY = Number(block?.y || 1);
  const legacyW = Number(block?.w || 6);
  const legacyH = Number(block?.h || 2);
  const legacyOrder = Number(block?.order || index + 1);
  const layout = block?.layout || {};
  const lg = layout.lg || { x: legacyX, y: legacyY, w: legacyW, h: legacyH };
  const xs = layout.xs || { order: legacyOrder };
  return {
    lg: {
      x: Number(lg.x || 1),
      y: Number(lg.y || 1),
      w: Number(lg.w || 6),
      h: Number(lg.h || 2)
    },
    xs: {
      order: Number(xs.order || legacyOrder)
    }
  };
};

const normalizeBlock = (block, index = 0) => {
  const normalizedType = normalizeBlockType(block?.type);
  return {
    ...block,
    type: normalizedType,
    layout: normalizeBlockLayout(block, index),
    config: block?.config ? { ...block.config } : defaultBlockConfig(normalizedType)
  };
};

const blockOrderValue = (block, fallback = 0) => {
  const order = block?.layout?.xs?.order;
  if (Number.isFinite(Number(order))) return Number(order);
  if (Number.isFinite(Number(block?.order))) return Number(block.order);
  return fallback;
};

const blockLgLayout = (block) => block?.layout?.lg || normalizeBlockLayout(block).lg;

const blockGridPosition = (block, metrics, startX, startY, deltaX, deltaY) => {
  if (!metrics) return { x: startX, y: startY };
  const deltaCols = Math.round(deltaX / metrics.stepX);
  const deltaRows = Math.round(deltaY / metrics.stepY);
  const maxX = Math.max(1, GRID_COLUMNS - (block.w || 1) + 1);
  const nextX = Math.min(Math.max(1, startX + deltaCols), maxX);
  const nextY = Math.max(1, startY + deltaRows);
  return { x: nextX, y: nextY };
};

const findNextBlockPlacement = (blocks, width = 6, height = 2) => {
  const rects = blocks.map((block) => {
    const layout = blockLgLayout(block);
    return {
      x: layout.x || 1,
      y: layout.y || 1,
      w: layout.w || 1,
      h: layout.h || 1
    };
  });
  const maxY = rects.reduce((acc, rect) => Math.max(acc, rect.y + rect.h), 1);
  const maxCols = GRID_COLUMNS;
  for (let y = 1; y <= maxY + 6; y++) {
    for (let x = 1; x <= maxCols - width + 1; x++) {
      const candidate = { x, y, w: width, h: height };
      const overlaps = rects.some((rect) => {
        return !(
          candidate.x + candidate.w - 1 < rect.x ||
          rect.x + rect.w - 1 < candidate.x ||
          candidate.y + candidate.h - 1 < rect.y ||
          rect.y + rect.h - 1 < candidate.y
        );
      });
      if (!overlaps) {
        return { x, y };
      }
    }
  }
  return { x: 1, y: maxY + 1 };
};

const isResourcesBlock = (block) =>
  normalizeBlockType(block?.type) === BLOCK_TYPES.resourcesPinned;

const blockTypeIs = (block, type) => normalizeBlockType(block?.type) === type;

const blockTypeLabel = (block) => {
  const normalized = normalizeBlockType(block?.type);
  switch (normalized) {
    case BLOCK_TYPES.resourcesPinned:
      return t("block.type.resourcesPinned");
    case BLOCK_TYPES.text:
      return t("block.type.text");
    default:
      return normalized;
  }
};

const updateDashboardEditPanelPosition = (spaceId) => {
  if (!spaceId || !dashboardEditSelectedId.value) {
    dashboardEditPanelStyle.value = {};
    return;
  }
  const gridEl = document.querySelector(`[data-dashboard-grid="${spaceId}"]`);
  if (!gridEl) return;
  const blockEl = gridEl.querySelector(`[data-block-id="${dashboardEditSelectedId.value}"]`);
  if (!blockEl) return;
  const gridRect = gridEl.getBoundingClientRect();
  const blockRect = blockEl.getBoundingClientRect();
  const top = blockRect.top - gridRect.top + blockRect.height + 12;
  const left = Math.max(0, blockRect.left - gridRect.left);
  const maxLeft = Math.max(0, gridRect.width - 320);
  dashboardEditPanelStyle.value = {
    top: `${top}px`,
    left: `${Math.min(left, maxLeft)}px`
  };
};

const buildDashboardEditForm = (block) => {
  const normalized = normalizeBlock(block);
  const layout = blockLgLayout(normalized);
  const config = normalized.config || defaultBlockConfig(normalized.type);
  return {
    title: normalized.title || "",
    type: normalized.type || BLOCK_TYPES.resourcesPinned,
    x: layout.x || 1,
    y: layout.y || 1,
    w: layout.w || 6,
    h: layout.h || 2,
    order: blockOrderValue(normalized, 1),
    limit: config.limit ?? defaultBlockConfig(normalized.type).limit,
    scope: config.scope || "this",
    filter: config.filter || "",
    text: config.text || ""
  };
};

const setDashboardEditSelection = (spaceId, blockId) => {
  dashboardEditSelectedId.value = blockId;
  dashboardEditAdvanced.value = false;
  const selected = blocksForSpace(spaceId).find((block) => block.id === blockId);
  if (selected) {
    dashboardEditForm.value = buildDashboardEditForm(selected);
    nextTick().then(() => updateDashboardEditPanelPosition(spaceId));
  }
};

const syncDashboardEditForm = (spaceId) => {
  if (!dashboardEditSelectedId.value) return;
  const selected = blocksForSpace(spaceId).find(
    (block) => block.id === dashboardEditSelectedId.value
  );
  if (selected) {
    dashboardEditForm.value = buildDashboardEditForm(selected);
    nextTick().then(() => updateDashboardEditPanelPosition(spaceId));
  }
};

const applyDashboardEditForm = (spaceId) => {
  if (!dashboardEditSelectedId.value) return;
  const form = dashboardEditForm.value;
  updateDashboardBlocks(spaceId, (blocks) =>
    blocks.map((block) =>
      block.id === dashboardEditSelectedId.value
        ? {
            ...block,
            title: form.title,
            type: form.type,
            layout: {
              ...block.layout,
              lg: {
                ...blockLgLayout(block),
                x: Number(form.x || 1),
                y: Number(form.y || 1),
                w: Number(form.w || 6),
                h: Number(form.h || 2)
              },
              xs: {
                order: Number(form.order || 1)
              }
            },
            config: {
              limit: Number(form.limit || 0) || defaultBlockConfig(form.type).limit,
              scope: form.scope || "this",
              filter: form.filter || "",
              text: form.text || ""
            }
          }
        : block
    )
  );
};

const addDashboardBlockDraft = (space, overrideType = null) => {
  if (!space) return;
  const spaceId = space.id;
  const blocks = blocksForSpace(spaceId);
  const nextOrder = blocks.length + 1;
  const placement = findNextBlockPlacement(blocks, 6, 2);
  const newBlock = normalizeBlock(
    {
      id: `block-${Date.now()}`,
      type: overrideType || dashboardEditNewType.value || BLOCK_TYPES.resourcesPinned,
      title: "",
      layout: {
        lg: { x: placement.x, y: placement.y, w: 6, h: 2 },
        xs: { order: nextOrder }
      },
      config: defaultBlockConfig(overrideType || dashboardEditNewType.value || BLOCK_TYPES.resourcesPinned)
    },
    nextOrder - 1
  );
  updateDashboardBlocks(spaceId, (items) => [...items, newBlock]);
  setDashboardEditSelection(spaceId, newBlock.id);
  if (dashboardEditSpaceId.value === spaceId) {
    nextTick().then(() => initDashboardInteractions(space));
  }
};

const openAddBlockPicker = () => {
  dashboardAddOpen.value = true;
};

const closeAddBlockPicker = () => {
  dashboardAddOpen.value = false;
};

const addBlockFromPicker = (space, type) => {
  addDashboardBlockDraft(space, type);
  closeAddBlockPicker();
};

const deleteDashboardBlockDraft = (space, blockId) => {
  if (!space || !blockId) return;
  updateDashboardBlocks(space.id, (blocks) => blocks.filter((block) => block.id !== blockId));
  if (dashboardEditSelectedId.value === blockId) {
    const remaining = blocksForSpace(space.id);
    dashboardEditSelectedId.value = remaining[0]?.id || null;
    if (dashboardEditSelectedId.value) {
      dashboardEditForm.value = buildDashboardEditForm(remaining[0]);
    }
  }
};

const discardDashboardChanges = async (space) => {
  if (!space) return;
  await loadDashboard(space);
  dashboardEditDirty.value = false;
  const blocks = blocksForSpace(space.id);
  dashboardEditSelectedId.value = blocks[0]?.id || null;
  if (dashboardEditSelectedId.value) {
    dashboardEditForm.value = buildDashboardEditForm(blocks[0]);
  }
};

const hasDashboard = (space) => {
  // Check if we have blocks in memory (from inline creation)
  const dash = dashboards.value[space.id];
  if (dash?.template?.blocks) {
    const blocks = Array.isArray(dash.template.blocks) 
      ? dash.template.blocks 
      : (typeof dash.template.blocks === 'string' ? JSON.parse(dash.template.blocks) : []);
    if (blocks.length > 0) return true;
  }
  // Fall back to display config check
  const cfg = parseDisplayConfig(space);
  return cfg.use_dashboard === true || cfg.dashboard_template_key || cfg.shared_template_key;
};

const dashboardForSpace = (spaceId) => dashboards.value[spaceId] || null;

const blocksForSpace = (spaceId) => {
  const dash = dashboardForSpace(spaceId);
  if (!dash?.template?.blocks) return [];
  try {
    const rawBlocks = Array.isArray(dash.template.blocks)
      ? dash.template.blocks
      : JSON.parse(dash.template.blocks);
    return rawBlocks.map((block, idx) => normalizeBlock(block, idx));
  } catch {
    return [];
  }
};

const blockOrderForSpace = (spaceId, blocks) => {
  const dash = dashboardForSpace(spaceId);
  let order = [];
  if (dash?.mobile_order) {
    try {
      order = Array.isArray(dash.mobile_order) ? dash.mobile_order : JSON.parse(dash.mobile_order);
    } catch {
      order = [];
    }
  }
  if (order.length === 0) {
    return blocks
      .slice()
      .sort((a, b) => blockOrderValue(a, 0) - blockOrderValue(b, 0))
      .map((block) => block.id);
  }
  return order;
};

const blockOrderMapForSpace = (spaceId) => {
  const blocks = blocksForSpace(spaceId);
  const order = blockOrderForSpace(spaceId, blocks);
  return order.reduce((acc, id, idx) => {
    acc[id] = idx + 1;
    return acc;
  }, {});
};

const blockOrderMapFromBlocks = (blocks) =>
  blocks.reduce((acc, block, idx) => {
    if (block.id) {
      acc[block.id] = blockOrderValue(block, idx + 1);
    }
    return acc;
  }, {});

const blockStyle = (block, orderMap) => {
  const layout = blockLgLayout(block);
  const styles = {
    gridColumn: `${layout.x || 1} / span ${layout.w || 4}`,
    gridRow: `${layout.y || 1} / span ${layout.h || 2}`
  };
  if (isMobile.value) {
    styles.order = orderMap[block.id] ?? 0;
  }
  return styles;
};

const blockTitle = (block) => block.title || blockTypeLabel(block) || "Block";

const blockDataFor = (spaceId, blockId) =>
  dashboardData.value[spaceId]?.[blockId] || [];

const blockDataCount = (spaceId, blockId) => {
  const data = dashboardData.value[spaceId]?.[blockId];
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") return Object.keys(data).length;
  return 0;
};

const resolveSpaceDatabaseId = (databaseId, spaceSlug) => {
  const numeric = Number(databaseId);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  if (spaceSlug) {
    const fromSpaces = spaces.value.find((space) => space.id === spaceSlug);
    const spaceDatabaseId = Number(fromSpaces?.database_id);
    if (Number.isFinite(spaceDatabaseId) && spaceDatabaseId > 0) return spaceDatabaseId;
    const fromAdmin = spacesAdmin.value.find(
      (space) => space.slug === spaceSlug || String(space.id) === String(spaceSlug)
    );
    const adminId = Number(fromAdmin?.id);
    if (Number.isFinite(adminId) && adminId > 0) return adminId;
  }
  return null;
};

const isDashboardEditing = (space) =>
  !!space && dashboardEditSpaceId.value === space.id;

const updateDashboardBlocks = (spaceId, updater) => {
  const existing = dashboards.value[spaceId];
  const dash =
    existing?.template?.blocks !== undefined
      ? existing
      : {
          space: spaces.value.find((space) => space.id === spaceId) || {},
          template: { id: 0, key: "", version: 0, blocks: [] },
          preferences: { hidden_block_ids: [], block_order: [] },
          mobile_order: []
        };
  let blocks = [];
  try {
    blocks = Array.isArray(dash.template.blocks)
      ? dash.template.blocks
      : JSON.parse(dash.template.blocks);
  } catch {
    blocks = [];
  }
  const normalized = blocks.map((block, idx) => normalizeBlock(block, idx));
  const updatedBlocks = updater(normalized.map((block) => ({ ...block })));
  dashboards.value = {
    ...dashboards.value,
    [spaceId]: {
      ...dash,
      template: {
        ...dash.template,
        blocks: updatedBlocks
      }
    }
  };
  dashboardEditDirty.value = true;
  if (dashboardEditSpaceId.value === spaceId) {
    syncDashboardEditForm(spaceId);
    nextTick().then(() => updateDashboardEditPanelPosition(spaceId));
  }
};

const GRID_COLUMNS = 12;
const GRID_GAP = 12;
const GRID_ROW_HEIGHT = 48;
let activeDashboardElements = [];

const getGridMetrics = (gridEl) => {
  if (!gridEl) return null;
  const width = gridEl.clientWidth;
  const columnWidth = (width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const stepX = columnWidth + GRID_GAP;
  const stepY = GRID_ROW_HEIGHT + GRID_GAP;
  return { columnWidth, stepX, stepY };
};

const initDashboardInteractions = (space) => {
  if (!space || !isDashboardEditing(space) || isMobile.value) return;
  const gridEl = document.querySelector(`[data-dashboard-grid="${space.id}"]`);
  const metrics = getGridMetrics(gridEl);
  if (!metrics) return;

  activeDashboardElements.forEach((el) => interact(el).unset());
  activeDashboardElements = [];

  const elements = gridEl.querySelectorAll(`[data-space-id="${space.id}"][data-block-id]`);
  elements.forEach((el) => {
    const blockId = el.getAttribute("data-block-id");
    if (!blockId) return;
    const currentBlock = blocksForSpace(space.id).find((block) => block.id === blockId);
    if (!currentBlock) return;

    el.dataset.x = "0";
    el.dataset.y = "0";
    el.style.transform = "translate(0px, 0px)";

    const draggable = interact(el).draggable({
      inertia: true,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: gridEl,
          endOnly: true
        })
      ],
      listeners: {
        start: (event) => {
          dashboardDragging.value = true;
          const block = blocksForSpace(space.id).find((b) => b.id === blockId);
          if (!block) return;
          const layout = blockLgLayout(block);
          event.target.dataset.startX = String(layout.x || 1);
          event.target.dataset.startY = String(layout.y || 1);
          event.target.dataset.dragX = "0";
          event.target.dataset.dragY = "0";
          dashboardDragGhost.value = {
            spaceId: space.id,
            id: blockId,
            x: layout.x || 1,
            y: layout.y || 1,
            w: layout.w || 1,
            h: layout.h || 1
          };
        },
        move: (event) => {
          const target = event.target;
          const dragX = (parseFloat(target.dataset.dragX) || 0) + event.dx;
          const dragY = (parseFloat(target.dataset.dragY) || 0) + event.dy;
          target.dataset.dragX = String(dragX);
          target.dataset.dragY = String(dragY);
          target.style.transform = `translate(${dragX}px, ${dragY}px)`;

          const startX = Number(target.dataset.startX || 1);
          const startY = Number(target.dataset.startY || 1);
          const block = blocksForSpace(space.id).find((b) => b.id === blockId);
          if (block) {
            const layout = blockLgLayout(block);
            const position = blockGridPosition(
              { w: layout.w || 1 },
              metrics,
              startX,
              startY,
              dragX,
              dragY
            );
            dashboardDragGhost.value = {
              spaceId: space.id,
              id: blockId,
              x: position.x,
              y: position.y,
              w: layout.w || 1,
              h: layout.h || 1
            };
          }
        },
        end: (event) => {
          dashboardDragging.value = false;
          const target = event.target;
          const startX = Number(target.dataset.startX || 1);
          const startY = Number(target.dataset.startY || 1);
          const dx = parseFloat(target.dataset.dragX) || 0;
          const dy = parseFloat(target.dataset.dragY) || 0;
          const block = blocksForSpace(space.id).find((b) => b.id === blockId);
          if (block) {
            const layout = blockLgLayout(block);
            const position = blockGridPosition(
              { w: layout.w || 1 },
              metrics,
              startX,
              startY,
              dx,
              dy
            );
            updateDashboardBlocks(space.id, (blocks) =>
              blocks.map((b) =>
                b.id === blockId
                  ? {
                      ...b,
                      layout: {
                        ...b.layout,
                        lg: { ...blockLgLayout(b), x: position.x, y: position.y }
                      }
                    }
                  : b
              )
            );
          }
          target.style.transform = "translate(0px, 0px)";
          target.dataset.dragX = "0";
          target.dataset.dragY = "0";
          dashboardDragGhost.value = null;
          updateDashboardEditPanelPosition(space.id);
        }
      }
    });

    const resizable = interact(el).resizable({
      edges: {
        right: ".dashboard-resize-handle",
        bottom: ".dashboard-resize-handle"
      },
      modifiers: [
        interact.modifiers.snapSize({
          targets: [interact.snappers.grid({ x: metrics.stepX, y: metrics.stepY })],
          range: Math.max(metrics.stepX, metrics.stepY) * 0.75
        }),
        interact.modifiers.restrictEdges({
          outer: gridEl,
          endOnly: true
        })
      ],
      listeners: {
        start: (event) => {
          dashboardDragging.value = true;
          const block = blocksForSpace(space.id).find((b) => b.id === blockId);
          if (!block) return;
          const layout = blockLgLayout(block);
          event.target.dataset.startW = String(layout.w || 1);
          event.target.dataset.startH = String(layout.h || 1);
          event.target.dataset.startX = String(layout.x || 1);
          dashboardDragGhost.value = {
            spaceId: space.id,
            id: blockId,
            x: layout.x || 1,
            y: layout.y || 1,
            w: layout.w || 1,
            h: layout.h || 1
          };
        },
        move: (event) => {
          event.target.style.width = `${event.rect.width}px`;
          event.target.style.height = `${event.rect.height}px`;
        },
        end: (event) => {
          dashboardDragging.value = false;
          const startW = Number(event.target.dataset.startW || 1);
          const startH = Number(event.target.dataset.startH || 1);
          const startX = Number(event.target.dataset.startX || 1);
          const width = event.rect.width;
          const height = event.rect.height;
          const nextW = Math.max(2, Math.round((width + GRID_GAP) / metrics.stepX));
          const nextH = Math.max(2, Math.round((height + GRID_GAP) / metrics.stepY));
          const maxW = Math.max(1, GRID_COLUMNS - startX + 1);
          const finalW = Math.min(Math.max(2, startW + (nextW - startW)), maxW);
          const finalH = Math.max(2, startH + (nextH - startH));
          updateDashboardBlocks(space.id, (blocks) =>
            blocks.map((b) =>
              b.id === blockId
                ? {
                    ...b,
                    layout: {
                      ...b.layout,
                      lg: { ...blockLgLayout(b), w: finalW, h: finalH }
                    }
                  }
                : b
            )
          );
          event.target.style.width = "";
          event.target.style.height = "";
          dashboardDragGhost.value = null;
          updateDashboardEditPanelPosition(space.id);
        }
      }
    });

    activeDashboardElements.push(el);
    draggable.resizable = resizable;
  });
};

const stopDashboardInteractions = () => {
  activeDashboardElements.forEach((el) => interact(el).unset());
  activeDashboardElements = [];
};

const startDashboardEdit = async (space) => {
  if (!space || !canManage.value || isMobile.value || (isPublicReadonlySpace(space) && !showAdmin.value)) return;
  dashboardEditSpaceId.value = space.id;
  dashboardEditDirty.value = false;
  const blocks = blocksForSpace(space.id);
  if (blocks.length > 0) {
    setDashboardEditSelection(space.id, blocks[0].id);
  } else {
    dashboardEditSelectedId.value = null;
  }
  await nextTick();
  initDashboardInteractions(space);
  updateDashboardEditPanelPosition(space.id);
};

const stopDashboardEdit = () => {
  dashboardEditSpaceId.value = null;
  dashboardEditDirty.value = false;
  dashboardEditSelectedId.value = null;
  dashboardEditPanelStyle.value = {};
  stopDashboardInteractions();
};

const toggleDashboardEdit = async (space) => {
  if (isDashboardEditing(space)) {
    stopDashboardEdit();
    return;
  }
  await startDashboardEdit(space);
};

const saveDashboardLayout = async (space) => {
  if (!space || (isPublicReadonlySpace(space) && !showAdmin.value)) return;
  const databaseId = resolveSpaceDatabaseId(space.database_id, space.id);
  if (!databaseId) {
    showToast("No database ID for space", "error");
    return;
  }
  dashboardEditorSaving.value = true;
  try {
    const blocks = blocksForSpace(space.id);
    const payload = {
      blocks,
      block_order: blockOrderForSpace(space.id, blocks)
    };
    const updated = await fetchJSON(withRoleOverride(`/api/spaces/${databaseId}/dashboard`), {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    dashboards.value = { ...dashboards.value, [space.id]: updated };
    dashboardEditDirty.value = false;
    showToast(t("app.saveDone"), "success");
  } catch (err) {
    showToast(err.message || t("app.saveFailed"), "error");
  } finally {
    dashboardEditorSaving.value = false;
  }
};

const loadDashboard = async (space, force = false) => {
  if (!space?.id || !space?.database_id) return;
  if (!force && !hasDashboard(space)) return;
  dashboardLoading.value = { ...dashboardLoading.value, [space.id]: true };
  try {
    const dash = await fetchJSON(withRoleOverride(`/api/spaces/${space.database_id}/dashboard`));
    dashboards.value = { ...dashboards.value, [space.id]: dash };
    const blocks = blocksForSpace(space.id);
    const ids = blocks.map((block) => block.id).filter(Boolean);
    if (ids.length > 0) {
      const types = blocks.map((block) => block.type).filter(Boolean);
      const typeParam = types.length ? `&types=${encodeURIComponent(types.join(","))}` : "";
      const data = await fetchJSON(withRoleOverride(`/api/spaces/${space.database_id}/blocks/data?ids=${ids.join(",")}${typeParam}`));
      dashboardData.value = { ...dashboardData.value, [space.id]: data };
    }
  } catch (err) {
    console.error("Failed to load dashboard:", err);
  } finally {
    dashboardLoading.value = { ...dashboardLoading.value, [space.id]: false };
  }
};

const openDashboardEditor = async (space) => {
  if (!space?.id || (isPublicReadonlySpace(space) && !showAdmin.value)) return;
  dashboardEditorSpace.value = space;
  showDashboardEditor.value = true;
  dashboardPreviewRole.value = "admin";
  await loadDashboard(space);
  await loadDashboardPreview(space, dashboardPreviewRole.value);
  const blocks = blocksForSpace(space.id);
  dashboardEditorBlocks.value = blocks.map((block) => ({ ...block }));
  dashboardEditorOrder.value = blockOrderForSpace(space.id, blocks);
};

const addDashboardBlock = () => {
  const nextOrder = dashboardEditorBlocks.value.length + 1;
  dashboardEditorBlocks.value = [
    ...dashboardEditorBlocks.value,
    normalizeBlock({
      id: `block-${Date.now()}`,
      type: BLOCK_TYPES.resourcesPinned,
      title: "New block",
      layout: {
        lg: { x: 1, y: 1, w: 6, h: 2 },
        xs: { order: nextOrder }
      },
      config: defaultBlockConfig(BLOCK_TYPES.resourcesPinned)
    }, nextOrder - 1)
  ];
};

const saveDashboardEditor = async () => {
  if (!dashboardEditorSpace.value?.id || !dashboardEditorSpace.value?.database_id) return;
  dashboardEditorSaving.value = true;
  try {
    const payload = {
      blocks: dashboardEditorBlocks.value,
      block_order: dashboardEditorOrder.value
    };
    const updated = await fetchJSON(withRoleOverride(`/api/spaces/${dashboardEditorSpace.value.database_id}/dashboard`), {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    dashboards.value = { ...dashboards.value, [dashboardEditorSpace.value.id]: updated };
    showToast(t("app.saveDone"), "success");
  } catch (err) {
    showToast(err.message || t("app.saveFailed"), "error");
  } finally {
    dashboardEditorSaving.value = false;
  }
};

// Inline block editing functions
const openBlockSettings = (block, spaceSlug, databaseId = null) => {
  const normalized = normalizeBlock(block);
  inlineEditBlock.value = { block, spaceSlug, databaseId };
  inlineEditPopover.value = 'settings';
  inlineEditAdvanced.value = false;
  const layout = blockLgLayout(normalized);
  inlineEditForm.value = {
    title: normalized.title || '',
    type: normalized.type || BLOCK_TYPES.resourcesPinned,
    x: layout.x || 1,
    y: layout.y || 1,
    w: layout.w || 6,
    h: layout.h || 2,
    order: blockOrderValue(normalized, 1),
    limit: normalized.config?.limit ?? defaultBlockConfig(normalized.type).limit,
    scope: normalized.config?.scope ?? "this",
    filter: normalized.config?.filter ?? "",
    text: normalized.config?.text ?? ""
  };
};

const openBlockAddContent = (block, spaceSlug, databaseId = null) => {
  inlineEditBlock.value = { block, spaceSlug, databaseId };
  inlineEditPopover.value = 'add';
  inlineAddForm.value = {
    title: '',
    body: '',
    url: '',
    priority: 'normal',
    pinned: false
  };
};

const closeInlineEdit = () => {
  inlineEditBlock.value = null;
  inlineEditPopover.value = null;
};

const saveBlockSettings = async () => {
  if (!inlineEditBlock.value) return;
  const { block, spaceSlug, databaseId } = inlineEditBlock.value;
  const resolvedDatabaseId = resolveSpaceDatabaseId(databaseId, spaceSlug);
  if (!resolvedDatabaseId) {
    showToast("No database ID for space", "error");
    return;
  }
  
  try {
    // Get current blocks and update the one being edited
    const currentBlocks = blocksForSpace(spaceSlug);
    const updatedBlocks = currentBlocks.map(b =>
      b.id === block.id
        ? {
            ...b,
            title: inlineEditForm.value.title,
            type: inlineEditForm.value.type,
            layout: {
              ...b.layout,
              lg: {
                ...blockLgLayout(b),
                x: inlineEditForm.value.x,
                y: inlineEditForm.value.y,
                w: inlineEditForm.value.w,
                h: inlineEditForm.value.h
              },
              xs: {
                order: Number(inlineEditForm.value.order || 1)
              }
            },
            config: {
              limit:
                Number(inlineEditForm.value.limit || 0) ||
                defaultBlockConfig(inlineEditForm.value.type).limit,
              scope: inlineEditForm.value.scope || "this",
              filter: inlineEditForm.value.filter || "",
              text: inlineEditForm.value.text || ""
            }
          }
        : b
    );
    
    const payload = {
      blocks: updatedBlocks,
      block_order: blockOrderForSpace(spaceSlug, currentBlocks)
    };
    
    const updated = await fetchJSON(withRoleOverride(`/api/spaces/${resolvedDatabaseId}/dashboard`), {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    
    dashboards.value = { ...dashboards.value, [spaceSlug]: updated };
    showToast("Block updated", "success");
    closeInlineEdit();
  } catch (err) {
    showToast(err.message || "Failed to update block", "error");
  }
};

const deleteBlockInline = async (block, spaceSlug, databaseId) => {
  if (!confirm(`Delete block "${block.title || blockTypeLabel(block)}"?`)) return;
  const resolvedDatabaseId = resolveSpaceDatabaseId(databaseId, spaceSlug);
  if (!resolvedDatabaseId) {
    showToast("No database ID for space", "error");
    return;
  }
  
  try {
    const currentBlocks = blocksForSpace(spaceSlug);
    const updatedBlocks = currentBlocks.filter(b => b.id !== block.id);
    
    const payload = {
      blocks: updatedBlocks,
      block_order: blockOrderForSpace(spaceSlug, currentBlocks).filter(id => id !== block.id)
    };
    
    const updated = await fetchJSON(withRoleOverride(`/api/spaces/${resolvedDatabaseId}/dashboard`), {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    
    dashboards.value = { ...dashboards.value, [spaceSlug]: updated };
    showToast("Block deleted", "success");
    closeInlineEdit();
  } catch (err) {
    showToast(err.message || "Failed to delete block", "error");
  }
};

const addBlockInline = async (
  databaseId,
  spaceSlug,
  blockType = BLOCK_TYPES.resourcesPinned,
  blockTitle = 'New Block'
) => {
  // Validate databaseId - must be a positive integer
  const numericSpaceId = resolveSpaceDatabaseId(databaseId, spaceSlug);
  if (!numericSpaceId) {
    showToast(`Invalid space database ID: ${databaseId}`, "error");
    console.error("addBlockInline called with invalid databaseId:", databaseId, "spaceSlug:", spaceSlug);
    return;
  }
  const space = spaces.value.find((item) => item.id === spaceSlug);
  if (isPublicReadonlySpace(space) && !showAdmin.value) {
    showToast("Public spaces are read-only", "error");
    return;
  }
  
  try {
    const currentBlocks = blocksForSpace(spaceSlug);
    const nextOrder = currentBlocks.length + 1;
    const currentMaxY = currentBlocks.length > 0
      ? Math.max(...currentBlocks.map(b => (blockLgLayout(b).y || 1) + (blockLgLayout(b).h || 2)), 1)
      : 1;
    const newBlock = normalizeBlock({
      id: `block-${Date.now()}`,
      type: blockType,
      title: blockTitle,
      layout: {
        lg: { x: 1, y: currentMaxY, w: 6, h: 2 },
        xs: { order: nextOrder }
      },
      config: defaultBlockConfig(blockType)
    }, nextOrder - 1);
    
    const updatedBlocks = [...currentBlocks, newBlock];
    const currentOrder = currentBlocks.length > 0 ? blockOrderForSpace(spaceSlug, currentBlocks) : [];
    const payload = {
      blocks: updatedBlocks,
      block_order: [...currentOrder, newBlock.id]
    };
    
    console.log("Creating dashboard for space:", numericSpaceId, "(slug:", spaceSlug, ") payload:", payload);
    
    const updated = await fetchJSON(withRoleOverride(`/api/spaces/${numericSpaceId}/dashboard`), {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    
    dashboards.value = { ...dashboards.value, [spaceSlug]: updated };
    showToast("Block added", "success");
    if (dashboardEditSpaceId.value === spaceSlug) {
      await nextTick();
      initDashboardInteractions({ id: spaceSlug });
    }
    
    // Open settings for the new block
    openBlockSettings(newBlock, spaceSlug, numericSpaceId);
  } catch (err) {
    console.error("Failed to add block:", err, "databaseId was:", databaseId, "spaceSlug was:", spaceSlug);
    showToast(err.message || "Failed to add block", "error");
  }
};

// Create initial dashboard from placeholder click
const createBlockFromPlaceholder = async (space, blockType, blockTitle) => {
  if (!canManage.value || (isPublicReadonlySpace(space) && !showAdmin.value)) return;
  await addBlockInline(space?.database_id, space?.id, blockType, blockTitle);
};

const saveInlineContent = async () => {
  if (!inlineEditBlock.value) return;
  const { block, spaceSlug, databaseId } = inlineEditBlock.value;
  const resolvedSpaceId = resolveSpaceDatabaseId(databaseId, spaceSlug);
  if (!resolvedSpaceId) {
    showToast("No database ID for space", "error");
    return;
  }
  const space = spaces.value.find((item) => item.id === spaceSlug);
  if (isPublicReadonlySpace(space) && !showAdmin.value) {
    showToast("Public spaces are read-only", "error");
    return;
  }
  
  try {
    if (isResourcesBlock(block)) {
      const payload = {
        space_id: resolvedSpaceId,
        title: inlineAddForm.value.title,
        url: inlineAddForm.value.url,
        item_type: 'resource',
        pinned: true,
        audience_groups: ['user', 'admin']
      };
      await fetchJSON("/api/directory_items", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showToast("Resource created", "success");
    }
    
    // Reload dashboard data
    const space = spaces.value.find(s => s.id === spaceSlug);
    if (space) {
      await loadDashboard(space);
    }
    
    closeInlineEdit();
  } catch (err) {
    showToast(err.message || "Failed to add content", "error");
  }
};

const deleteInlineItem = async (item, blockType, spaceId) => {
  if (!confirm(`Delete "${item.title}"?`)) return;
  const space = spaces.value.find((s) => s.id === spaceId);
  if (isPublicReadonlySpace(space) && !showAdmin.value) {
    showToast("Public spaces are read-only", "error");
    return;
  }
  
  try {
    const normalizedType = normalizeBlockType(blockType);
    if (normalizedType === BLOCK_TYPES.resourcesPinned) {
      await fetchJSON(`/api/directory_items/${item.id}`, { method: "DELETE" });
      showToast("Resource deleted", "success");
    }
    
    // Reload dashboard data
    if (space) {
      await loadDashboard(space);
    }
  } catch (err) {
    showToast(err.message || "Failed to delete item", "error");
  }
};

const normalizeSpaceKey = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  return raw
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
};

const widgetInSpace = (widget, space) => {
  if (!widget?.spaces || widget.spaces.length === 0) return true;
  if (widget.spaces.includes("*")) return true;
  if (!space) return false;
  const cfg = typeof space === "object" ? parseDisplayConfig(space) : {};
  const candidates = [];
  if (typeof space === "string") {
    candidates.push(space);
  } else {
    candidates.push(space.id, space.title, cfg?.url);
  }
  const normalizedTargets = candidates.map(normalizeSpaceKey).filter(Boolean);
  const normalizedAllowed = widget.spaces.map(normalizeSpaceKey).filter(Boolean);
  return normalizedAllowed.some((value) => normalizedTargets.includes(value));
};

const clockThemeClass = (widget, space) => {
  if (widget?.type !== "clock") return "";
  const theme = widget?.style || (isKidsSpace(space) ? "warm" : "glass");
  return theme === "warm" ? "card-clock-warm" : "card-clock";
};

const globalWidgets = computed(() =>
  widgets.value.filter((widget) => widgetInSpace(widget, null))
);

const localWidgets = (space) =>
  widgets.value
    .filter(
      (widget) =>
        widgetInSpace(widget, space) &&
        !widget.spaces.includes("*")
    )
    .sort((a, b) => {
      const aTech = a.id?.includes("admin") ? 1 : 0;
      const bTech = b.id?.includes("admin") ? 1 : 0;
      return aTech - bTech;
    });

const gridClass = (space) => {
  switch (space.layout_mode) {
    case "hero":
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6";
    case "list":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";
    default:
      return "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-4";
  }
};

const clearBackgroundTimer = () => {
  if (backgroundTimer.value) {
    clearTimeout(backgroundTimer.value);
    backgroundTimer.value = null;
  }
};

const scheduleBackgroundRefresh = () => {
  clearBackgroundTimer();
  const space = currentSpace.value;
  if (!space) return;
  const cfg = parseDisplayConfig(space);
  const mode = String(cfg.background_mode || "").toLowerCase();
  const items = Array.isArray(cfg.backgrounds) ? cfg.backgrounds : [];
  if (!items.length) return;
  if (mode !== "time" && mode !== "rotate" && mode !== "random") return;
  const rotateMinutes = Math.max(1, Number(cfg.background_rotate_minutes || 10));
  const delayMs =
    mode === "rotate" || mode === "random"
      ? rotateMinutes * 60 * 1000
      : 60 * 1000;
  backgroundTimer.value = setTimeout(() => {
    if (currentSpace.value) {
      setBackground(currentSpace.value);
    }
    scheduleBackgroundRefresh();
  }, delayMs);
};

const parseTimeValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const isTimeInRange = (nowMinutes, fromMinutes, toMinutes) => {
  if (fromMinutes == null && toMinutes == null) return true;
  if (fromMinutes == null) return nowMinutes <= toMinutes;
  if (toMinutes == null) return nowMinutes >= fromMinutes;
  if (fromMinutes <= toMinutes) {
    return nowMinutes >= fromMinutes && nowMinutes <= toMinutes;
  }
  return nowMinutes >= fromMinutes || nowMinutes <= toMinutes;
};

const matchesBackgroundWhen = (when, context) => {
  if (!when) return true;
  const segmentRule = when.segment ?? when.user_segment;
  if (segmentRule) {
    const current = String(context.segment || "").toLowerCase();
    if (!current) return false;
    const allowed = Array.isArray(segmentRule)
      ? segmentRule.map((value) => String(value).toLowerCase())
      : [String(segmentRule).toLowerCase()];
    if (!allowed.includes(current)) return false;
  }
  const timeRule = when.time || {};
  const fromValue = when.from ?? timeRule.from;
  const toValue = when.to ?? timeRule.to;
  const fromMinutes = parseTimeValue(fromValue);
  const toMinutes = parseTimeValue(toValue);
  if (fromMinutes != null || toMinutes != null) {
    if (!isTimeInRange(context.nowMinutes, fromMinutes, toMinutes)) return false;
  }
  return true;
};

const backgroundFor = (space) => {
  if (!space) return "";
  const fallback = space.background_url || space.background || "";
  const cfg = parseDisplayConfig(space);
  const mode = String(cfg.background_mode || "static").toLowerCase();
  const rotateMinutes = Math.max(1, Number(cfg.background_rotate_minutes || 10));
  const items = Array.isArray(cfg.backgrounds) ? cfg.backgrounds : [];
  if (!items.length) return fallback;
  const now = new Date();
  const context = {
    segment: me.value?.segment,
    nowMinutes: now.getHours() * 60 + now.getMinutes()
  };
  const normalized = items
    .map((entry) => {
      const payload = typeof entry === "string" ? { url: entry } : entry;
      const url = String(payload?.url || "").trim();
      if (!url) return null;
      return { url, when: payload.when || null };
    })
    .filter(Boolean);
  if (!normalized.length) return fallback;

  const eligible = normalized.filter((item) =>
    matchesBackgroundWhen(item.when, context)
  );
  const pool = eligible.length ? eligible : normalized;
  const defaultItem = normalized.find((item) => !item.when) || null;
  if (mode === "random") {
    const key = String(space.id || space.slug || "default");
    const windowMs = rotateMinutes * 60 * 1000;
    const windowIndex = Math.floor(Date.now() / windowMs);
    const cachedWindow = backgroundRandomWindow[key];
    if (cachedWindow !== windowIndex || backgroundRandomIndex[key] == null) {
      backgroundRandomWindow[key] = windowIndex;
      backgroundRandomIndex[key] = Math.floor(Math.random() * pool.length);
    }
    const idx = backgroundRandomIndex[key];
    return pool[idx]?.url || defaultItem?.url || fallback;
  }
  if (mode === "rotate") {
    const windowMs = rotateMinutes * 60 * 1000;
    const idx = Math.floor(Date.now() / windowMs) % pool.length;
    return pool[idx]?.url || defaultItem?.url || fallback;
  }
  if (mode === "time") {
    return (eligible[0] || defaultItem || pool[0] || {}).url || fallback;
  }
  return (defaultItem || pool[0] || {}).url || fallback;
};

const setBackground = (space) => {
  const url = backgroundFor(space);
  if (showA.value) {
    bgB.value = url;
    showA.value = false;
  } else {
    bgA.value = url;
    showA.value = true;
  }
};

const backgroundBlurDisabled = computed(() => {
  const cfg = parseDisplayConfig(currentSpace.value);
  const val = cfg.background_blur;
  if (val === false) return true;
  if (val === "off") return true;
  if (val === 0) return true;
  return false;
});

const backgroundPixelated = computed(() => {
  const cfg = parseDisplayConfig(currentSpace.value);
  const val = cfg.background_pixelated ?? cfg.backgroundPixelated;
  return val === true || val === "true" || val === 1 || val === "on";
});


const updateIndex = () => {
  if (scrollLock.value) return;
  const el = stageRef.value;
  if (!el) return;
  const width = el.clientWidth;
  if (!width) return;
  const nextIndex = Math.round(el.scrollLeft / width);
  if (nextIndex !== currentIndex.value) {
    currentIndex.value = nextIndex;
    const active = spaces.value[nextIndex];
    if (active?.id) {
      updateRecentSpaces(active.id);
    }
  }
};

const updateClock = () => {
  clockNow.value = new Date();
};

const clockTimeFor = (widget) => {
  const format = String(widget?.time_format || "24");
  const hour12 = format === "12";
  return clockNow.value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12 });
};

const clockDateFor = () =>
  clockNow.value.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });

const calendarDateLabel = (widget) => {
  if (widget?.date_label) return widget.date_label;
  return clockNow.value.toLocaleDateString([], { day: "2-digit", month: "short" }).toUpperCase();
};

const hasClockWidget = computed(() => {
  if (!currentSpace.value) return false;
  const isClock = (widget) => widget?.type === "clock";
  if (globalWidgets.value.some(isClock)) return true;
  return localWidgets(currentSpace.value.id).some(isClock);
});

const handleVisibilityChange = () => {
  isPageVisible.value = !document.hidden;
  syncClockTimer();
};

const syncClockTimer = () => {
  const shouldRun = isPageVisible.value && !!stageRef.value && hasClockWidget.value;
  if (shouldRun) {
    if (!clockTimer) {
      updateClock();
      clockTimer = setInterval(updateClock, 1000);
    }
    return;
  }
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
};

const calendarVariant = (widget, space) => {
  if (widget?.style === "compact") return "compact";
  return space?.layout_mode === "list" ? "compact" : "default";
};

const calendarEventsFor = (widget, space) => {
  const events = Array.isArray(widget?.events) ? widget.events : [];
  if (calendarVariant(widget, space) === "compact") {
    return events.slice(0, 2);
  }
  return events;
};

const todoItemsFor = (widget) => {
  if (!widget?.id || !Array.isArray(widget?.todos)) return [];
  if (!todoState.value[widget.id]) {
    todoState.value[widget.id] = widget.todos.map((todo) => !!todo.done);
  }
  return widget.todos.map((todo, idx) => ({
    ...todo,
    done: todoState.value[widget.id]?.[idx] ?? !!todo.done
  }));
};

const toggleTodo = (widgetId, index) => {
  if (!widgetId) return;
  const current = todoState.value[widgetId] || [];
  todoState.value = {
    ...todoState.value,
    [widgetId]: current.map((value, idx) => (idx === index ? !value : value))
  };
};

const bookingStatusLabel = (booking) => {
  if (!booking?.status) return "Status";
  return booking.status;
};

const bookingStatusClass = (booking) => {
  const status = String(booking?.status || "").toLowerCase();
  if (status.includes("free") || status.includes("available")) return "booking-status-free";
  if (status.includes("busy") || status.includes("occupied")) return "booking-status-busy";
  return "booking-status-warn";
};

const eventStatusClass = (event) => {
  const status = String(event?.status || "").toLowerCase();
  if (status.includes("urgent") || status.includes("alert")) return "event-dot-urgent";
  if (status.includes("done")) return "event-dot-done";
  return "event-dot-normal";
};

const formatNotifTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const scrollToIndex = (index, updateUrl = true, immediate = false) => {
  const el = stageRef.value;
  if (!el) {
    pendingScrollIndex.value = index;
    return;
  }
  const width = el.clientWidth;
  const distance = Math.abs(index - currentIndex.value);
  currentIndex.value = index;
  const active = spaces.value[index];
  if (active?.id) {
    updateRecentSpaces(active.id);
  }
  // Update URL to reflect current space (silently)
  const slug = spaceRouteSlug(active);
  if (updateUrl && slug) {
    const nextPath = index === 0 ? "/" : `/space/${slug}`;
    if (window.location.pathname !== nextPath) {
      history.replaceState(null, "", nextPath);
    }
  }
  scrollLock.value = true;
  if (scrollLockTimer) {
    clearTimeout(scrollLockTimer);
  }
  const isLowPerf = performanceMode.value === "low";
  const shouldImmediate = immediate || !initialScrollDone.value || isLowPerf;
  if (shouldImmediate) {
    scrollLockTimer = setTimeout(() => {
      scrollLock.value = false;
    }, 50);
    el.scrollLeft = width * index;
    initialScrollDone.value = true;
    return;
  }
  if (distance <= 1) {
    scrollLockTimer = setTimeout(() => {
      scrollLock.value = false;
    }, 420);
    el.scrollTo({ left: width * index, behavior: "smooth" });
  } else {
    scrollLockTimer = setTimeout(() => {
      scrollLock.value = false;
    }, 50);
    el.scrollLeft = width * index;
  }
  initialScrollDone.value = true;
};

watch(stageRef, (el) => {
  if (!el || pendingScrollIndex.value === null) return;
  const next = pendingScrollIndex.value;
  pendingScrollIndex.value = null;
  scrollToIndex(next, true, true);
});

const isTypingTarget = (event) => {
  const target = event.target;
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  return target.isContentEditable === true;
};

const toggleShortcuts = (event) => {
  event?.preventDefault();
  showShortcuts.value = !showShortcuts.value;
};

watch(currentIndex, async (idx) => {
  await nextTick();
  setBackground(spaces.value[idx]);
  scheduleBackgroundRefresh();
});

watch(
  () => me.value?.segment,
  () => {
    if (!currentSpace.value) return;
    setBackground(currentSpace.value);
    scheduleBackgroundRefresh();
  }
);

watch(
  () => widgets.value,
  () => {
    todoState.value = {};
  }
);

watch(
  () => adminTab.value,
  async (tab) => {
    if (tab !== "services") return;
    await loadServices();
    ensurePlacementDefaults();
    await loadPlacements();
  }
);

watch(
  () => placementSpaceId.value,
  async (value) => {
    if (adminTab.value !== "services") return;
    if (value) {
      placementForm.value = { ...placementForm.value, spaceId: String(value) };
    }
    await loadPlacements();
  }
);

watch(
  () => placementServiceKey.value,
  async () => {
    if (adminTab.value !== "services") return;
    await loadPlacements();
  }
);

watch(
  () => spacesAdmin.value.length,
  async (length) => {
    if (adminTab.value !== "services") return;
    if (!length) return;
    ensurePlacementDefaults();
    await loadPlacements();
  }
);

watch(
  () => isKioskMode.value,
  (value) => {
    if (!value) return;
    closeSpacePicker();
    showUserDropdown.value = false;
  }
);

watch([hasClockWidget, () => stageRef.value, isPageVisible], () => {
  syncClockTimer();
});

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const nextParam = params.get("next");
  const fallbackNext = window.location.pathname === "/login"
    ? "/"
    : `${window.location.pathname}${window.location.search}`;
  const next = nextParam || fallbackNext;
  loginUrl.value = `/auth/login?next=${encodeURIComponent(next)}`;
  loginPageUrl.value = `/login?next=${encodeURIComponent(next)}`;
  loginNext.value = next;
  isLoginPage.value = window.location.pathname === "/login";

  if (isLoginPage.value) {
    syncLangFromContext();
    loadAuthModes();
    loading.value = false;
    return;
  }

  pinnedSpaceIds.value = settingsStore.getJSON(pinnedSpacesKey, []);
  recentSpaceIds.value = settingsStore.getJSON(recentSpacesKey, []);
  recentResourcesBySpace.value = settingsStore.getJSON(recentResourcesKey, {});
  lastSpaceSlug.value = settingsStore.getJSON(lastSpaceSlugKey, "");
  performancePreference.value = settingsStore.getJSON(PERFORMANCE_PREF_KEY, "auto");

  loadAll();
  updateClock();
  updateViewport();
  syncClockTimer();
  window.addEventListener("resize", updateViewport);
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  
  // URL-based navigation
  window._atriumRouteHandler = () => {
    const route = parseRoute();
    if (route.view === 'admin') {
      showAdmin.value = true;
      adminTab.value = route.tab === "services" ? "dashboard" : route.tab;
    } else {
      showAdmin.value = false;
      if (route.spaceSlug) {
        lastSpaceSlug.value = route.spaceSlug;
        settingsStore.setJSON(lastSpaceSlugKey, route.spaceSlug);
      }
      // Handle space navigation after spaces are loaded
      if (route.spaceSlug && spaces.value.length > 0) {
        const idx = spaces.value.findIndex((space) => spaceRouteSlug(space) === route.spaceSlug);
        if (idx >= 0) {
          scrollToIndex(idx, false, !initialScrollDone.value); // Don't update URL since we're responding to URL change
        }
      }
    }
    syncLangFromContext();
  };
  
  // Initial route handling
  window._atriumRouteHandler();
  
  // Listen for history navigation
  window.addEventListener("popstate", window._atriumRouteHandler);
  hotkeysCleanup.value = tinykeys(window, {
    "?": (event) => toggleShortcuts(event),
    "Escape": (event) => {
      if (!showShortcuts.value) return;
      event.preventDefault();
      showShortcuts.value = false;
    },
    "ArrowRight": (event) => {
      if (isTypingTarget(event)) return;
      scrollToIndex(Math.min(currentIndex.value + 1, spaces.value.length - 1));
    },
    "ArrowLeft": (event) => {
      if (isTypingTarget(event)) return;
      scrollToIndex(Math.max(currentIndex.value - 1, 0));
    },
    "KeyD": (event) => {
      if (isTypingTarget(event)) return;
      scrollToIndex(Math.min(currentIndex.value + 1, spaces.value.length - 1));
    },
    "KeyA": (event) => {
      if (isTypingTarget(event)) return;
      scrollToIndex(Math.max(currentIndex.value - 1, 0));
    }
  });
});

watch(
  () => spaces.value.length,
  async (length) => {
    if (!length) return;
    
    // Check URL first for space navigation
    const route = parseRoute();
    if (route.spaceSlug) {
      const idx = spaces.value.findIndex((space) => spaceRouteSlug(space) === route.spaceSlug);
      if (idx >= 0) {
        await nextTick();
        scrollToIndex(idx, false, !initialScrollDone.value); // Don't update URL since we're responding to URL
        return;
      }
    }
    
    if (currentIndex.value !== 0) {
      await nextTick();
      scrollToIndex(0, true, !initialScrollDone.value);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
  clearBackgroundTimer();
  window.removeEventListener("resize", updateViewport);
  document.removeEventListener("click", handleGlobalClick);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  if (window._atriumRouteHandler) {
    window.removeEventListener("popstate", window._atriumRouteHandler);
    delete window._atriumRouteHandler;
  }
  if (hotkeysCleanup.value) {
    hotkeysCleanup.value();
    hotkeysCleanup.value = null;
  }
});
</script>

<template>
  <main class="spaces-root" :class="{ 'no-ui-blur': backgroundBlurDisabled }">
    <div
      class="bg-layer"
      :class="{ 'bg-visible': showA }"
      :style="{ backgroundImage: bgA ? `url(${bgA})` : 'none', imageRendering: backgroundPixelated ? 'pixelated' : 'auto' }"
    ></div>
    <div
      class="bg-layer"
      :class="{ 'bg-visible': !showA }"
      :style="{ backgroundImage: bgB ? `url(${bgB})` : 'none', imageRendering: backgroundPixelated ? 'pixelated' : 'auto' }"
    ></div>
    <div class="bg-overlay" :class="{ 'bg-overlay-no-blur': backgroundBlurDisabled }"></div>

    <header v-if="!isLoginPage && !isKioskMode" class="spaces-header">
      <div class="flex items-center gap-3">
        <div class="logo-pill">
          <Activity class="w-5 h-5 text-accent" />
        </div>
        <div>
          <div class="text-lg font-semibold tracking-tight">{{ t("app.title") }}</div>
          <div class="text-[11px] text-white/40 uppercase tracking-widest">{{ t("app.spaces") }}</div>
        </div>
      </div>

      <div v-if="spaces.length > 1" class="space-switcher-container">
        <div class="space-switcher-row" :class="{ 'has-prev': hasPrevSpaces, 'has-next': hasNextSpaces }">
          <button
            v-if="prevSpace"
            class="space-switcher-side space-switcher-side-prev hidden md:flex"
            @click="selectSpace(prevSpace)"
          >
            <ChevronLeft class="space-switcher-side-chevron" />
            <span class="space-switcher-side-icon">{{ spaceIconLabel(prevSpace) }}</span>
            <span class="space-switcher-side-title">{{ prevSpace.title }}</span>
          </button>
          <button class="space-switcher-trigger" @click="toggleSpacePicker">
            <Transition name="space-center" mode="out-in">
              <span :key="`center-icon-${currentSpace?.id || 'none'}`" class="space-switcher-icon">
                {{ spaceIconLabel(currentSpace) }}
              </span>
            </Transition>
            <Transition name="space-center" mode="out-in">
              <span :key="`center-text-${currentSpace?.id || 'none'}`" class="space-switcher-text">
                <span class="space-switcher-title">{{ currentSpace?.title || t("app.spaces") }}</span>
                <span v-if="spaceMetaLabel(currentSpace)" class="space-switcher-subtitle">
                  {{ spaceMetaLabel(currentSpace) }}
                </span>
              </span>
            </Transition>
            <ChevronDown class="w-4 h-4 text-white/40" :class="{ 'rotate-180': spacePickerOpen }" />
          </button>
          <button
            v-if="nextSpace"
            class="space-switcher-side space-switcher-side-next hidden md:flex"
            @click="selectSpace(nextSpace)"
          >
            <span class="space-switcher-side-icon">{{ spaceIconLabel(nextSpace) }}</span>
            <span class="space-switcher-side-title">{{ nextSpace.title }}</span>
            <ChevronRight class="space-switcher-side-chevron" />
          </button>
        </div>
      </div>

      <div class="header-actions">
        <div class="header-tools">
          <select
            v-if="languageSwitcherVisible && languageSwitcherMode === 'header'"
            v-model="languageSelection"
            class="select text-xs"
            :aria-label="t('language.title')"
          >
            <option v-for="lang in supportedLangs" :key="lang" :value="lang">
              {{ languageLabels[lang] || lang }}
            </option>
          </select>
        </div>

        <div class="header-divider"></div>

        <!-- User Menu -->
        <template v-if="authEnabled">
          <template v-if="authRequired">
            <a class="btn btn-primary" :href="loginPageUrl">{{ t("app.login") }}</a>
          </template>
          <template v-else-if="me">
            <div class="user-menu-container" ref="userMenuRef">
              <button 
                class="user-menu-trigger" 
                @click="showUserDropdown = !showUserDropdown"
              >
                <div class="user-avatar" :class="{ 'user-avatar-admin': actualIsAdmin }">
                  {{ userInitials }}
                </div>
                <ChevronDown class="w-3 h-3 text-white/40" :class="{ 'rotate-180': showUserDropdown }" />
              </button>
              <Transition name="dropdown">
                <div
                  v-if="showUserDropdown"
                  class="user-dropdown"
                  @click.stop
                >
                  <div class="user-dropdown-header">
                    <div class="user-dropdown-avatar" :class="{ 'user-avatar-admin': actualIsAdmin }">
                      {{ userInitials }}
                    </div>
                    <div class="user-dropdown-info">
                      <div class="user-dropdown-email">{{ me.email }}</div>
                      <div class="user-dropdown-role">
                        <span class="chip" :class="isAdmin ? 'chip-online' : ''">{{ effectiveRole }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="user-dropdown-divider"></div>
                  <button
                    v-if="isAdmin && ENABLE_V0_DEV_ADMIN_SEAMS"
                    class="user-dropdown-item"
                    :title="t('app.adminPanel')"
                    :aria-label="t('app.adminPanel')"
                    @click="navigateToAdmin(); showUserDropdown = false"
                  >
                    <Settings class="w-4 h-4" />
                    <span>{{ t("app.adminPanel") }}</span>
                  </button>
                  <div
                    v-if="languageSwitcherVisible && languageSwitcherMode === 'settings'"
                    class="user-dropdown-section user-dropdown-section-compact"
                  >
                    <div
                      class="user-dropdown-label"
                      :class="{ 'user-dropdown-label-icon': true }"
                    >
                      <Tooltip
                        :content="t('language.title')"
                        :disabled="tooltipsDisabled"
                        :delay="tooltipDelay"
                      >
                        <Globe class="w-4 h-4" />
                      </Tooltip>
                      <span class="sr-only">{{ t("language.title") }}</span>
                    </div>
                    <select v-model="languageSelection" class="select user-dropdown-select">
                      <option v-for="lang in supportedLangs" :key="lang" :value="lang">
                        {{ languageLabels[lang] || lang }}
                      </option>
                    </select>
                  </div>
                  <div
                    v-if="performanceSelectorVisible"
                    class="user-dropdown-section user-dropdown-section-compact"
                  >
                    <div
                      class="user-dropdown-label"
                      :class="{ 'user-dropdown-label-icon': true }"
                    >
                      <Tooltip
                        :content="t('performance.title')"
                        :disabled="tooltipsDisabled"
                        :delay="tooltipDelay"
                      >
                        <Gauge class="w-4 h-4" />
                      </Tooltip>
                      <span class="sr-only">{{ t("performance.title") }}</span>
                    </div>
                    <select v-model="performanceSelection" class="select user-dropdown-select">
                      <option value="auto">{{ t("performance.auto") }}</option>
                      <option value="low">{{ t("performance.low") }}</option>
                      <option value="normal">{{ t("performance.normal") }}</option>
                    </select>
                  </div>
                  <div
                    v-if="actualIsAdmin && ENABLE_V0_DEV_ADMIN_SEAMS"
                    class="user-dropdown-section user-dropdown-section-compact"
                  >
                    <div
                      class="user-dropdown-label"
                      :class="{ 'user-dropdown-label-icon': true }"
                    >
                      <Tooltip
                        :content="t('role.switch')"
                        :disabled="tooltipsDisabled"
                        :delay="tooltipDelay"
                      >
                        <UserCog class="w-4 h-4" />
                      </Tooltip>
                      <span class="sr-only">{{ t("role.switch") }}</span>
                    </div>
                    <select v-model="roleOverrideSelection" class="select user-dropdown-select">
                      <option v-for="role in roleOptions" :key="role" :value="role">
                        {{ role }}
                      </option>
                    </select>
                    <div v-if="roleOverrideActive" class="user-dropdown-note">
                      {{ t("role.actingAs", { role: effectiveRole }) }}
                    </div>
                  </div>
                  <button
                    class="user-dropdown-item user-dropdown-item-danger"
                    :title="t('app.logout')"
                    :aria-label="t('app.logout')"
                    @click="logout"
                  >
                    <LogOut class="w-4 h-4" />
                    <span>{{ t("app.logout") }}</span>
                  </button>
                </div>
              </Transition>
            </div>
          </template>
          <template v-else>
            <a class="btn btn-primary" :href="loginPageUrl">{{ t("app.login") }}</a>
          </template>
        </template>
      </div>
    </header>

    <div v-if="spacePickerOpen && !isKioskMode" class="space-picker-scrim" @click="closeSpacePicker"></div>
    <div
      v-if="spacePickerOpen && !isKioskMode"
      class="space-picker"
      :class="isMobile ? 'space-picker-sheet' : 'space-picker-dropdown'"
    >
      <div class="space-picker-header">
        <div>
          <div class="space-picker-title">{{ t("space.picker.title") }}</div>
          <div class="space-picker-subtitle">{{ t("space.picker.subtitle") }}</div>
        </div>
        <button class="btn btn-ghost btn-icon" @click="closeSpacePicker">
          <Tooltip
            :content="t('app.close')"
            :disabled="tooltipsDisabled"
            :delay="tooltipDelay"
          >
            <X class="w-4 h-4" />
          </Tooltip>
        </button>
      </div>
      <div class="space-picker-search">
        <Search class="w-4 h-4 text-white/40" />
        <input
          v-model="spaceQuery"
          type="search"
          class="space-picker-input"
          :placeholder="t('app.searchSpaces')"
        />
      </div>
      <div class="space-picker-body">
        <div v-if="spacePickerSections.length === 0" class="space-picker-empty">
          {{ t("app.noSpaces") }}
        </div>
        <div v-else class="space-picker-sections">
          <div v-for="section in spacePickerSections" :key="section.label" class="space-picker-section">
            <div class="space-picker-section-title">{{ t(section.label) }}</div>
            <div class="space-picker-list">
              <div
                v-for="space in section.items"
                :key="space.id"
                class="space-picker-item"
                :class="{ active: currentSpace?.id === space.id }"
                role="button"
                tabindex="0"
                @click="selectSpace(space)"
                @keydown.enter.prevent="selectSpace(space)"
              >
                <span class="space-picker-icon">{{ spaceIconLabel(space) }}</span>
                <span class="space-picker-info">
                  <span class="space-picker-name">{{ space.title }}</span>
                  <span v-if="spaceMetaLabel(space)" class="space-picker-meta">{{ spaceMetaLabel(space) }}</span>
                </span>
                <button
                  class="space-picker-pin"
                  :class="{ active: isPinnedSpace(space.id) }"
                  @click.stop="togglePinnedSpace(space.id)"
                >
                  <Tooltip
                    :content="t('space.picker.pin')"
                    :disabled="tooltipsDisabled"
                    :delay="tooltipDelay"
                  >
                    <Pin class="w-4 h-4" />
                  </Tooltip>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


    <div v-if="error" class="banner banner-error spaces-banner">
      <span>{{ error }}</span>
    </div>
    <div 
      v-if="toast.message" 
      class="banner spaces-banner"
      :class="{
        'banner-success': toast.type === 'success',
        'banner-error': toast.type === 'error',
        'banner-info': toast.type === 'info' || !toast.type
      }"
    >
      <span>{{ toast.message }}</span>
    </div>

    <!-- Hero Toast for Business Notifications -->
    <Transition name="hero-toast">
      <div v-if="activeHeroToast" class="hero-toast-container">
        <div class="hero-toast">
          <div class="hero-toast-progress" :style="{ width: `${heroToastProgress}%` }"></div>
          <button class="hero-toast-close" @click="dismissHeroToast()">
            <Tooltip
              :content="t('app.close')"
              :disabled="tooltipsDisabled"
              :delay="tooltipDelay"
            >
              <X class="w-4 h-4" />
            </Tooltip>
          </button>
          <div v-if="activeHeroToast.image_url" class="hero-toast-image">
            <img :src="activeHeroToast.image_url" :alt="activeHeroToast.title" />
          </div>
          <div class="hero-toast-content">
            <div class="hero-toast-header">
              <span v-if="activeHeroToast.icon" class="hero-toast-icon">{{ activeHeroToast.icon }}</span>
              <Bell v-else class="w-5 h-5 text-accent" />
              <span class="hero-toast-title">{{ activeHeroToast.title }}</span>
            </div>
            <div v-if="activeHeroToast.message" class="hero-toast-message">
              {{ activeHeroToast.message }}
            </div>
            <div v-if="activeHeroToast.actions && activeHeroToast.actions.length > 0" class="hero-toast-actions">
              <button
                v-for="action in activeHeroToast.actions"
                :key="action.id"
                class="btn"
                :class="{
                  'btn-primary': action.style === 'primary',
                  'btn-ghost': action.style !== 'primary',
                  'btn-danger': action.style === 'danger'
                }"
                @click="dismissHeroToast(action.id)"
              >
                {{ action.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <div v-if="isLoginPage" class="login-page">
      <div class="login-panel">
        <div class="logo-pill mx-auto mb-4">
          <Activity class="w-6 h-6 text-accent" />
        </div>
        <h2 class="text-xl font-semibold mb-2 text-center">{{ t("auth.title") }}</h2>
        <p class="text-white/50 text-sm text-center mb-6">
          {{ t("auth.subtitle") }}
        </p>
        <div v-if="authModes.oidc" class="mt-5">
          <a class="btn btn-primary w-full justify-center" :href="loginUrl">{{ t("auth.sso") }}</a>
        </div>
        <div v-if="showDevLogin" class="mt-5">
          <div class="text-white/40 text-xs text-center mb-2">{{ t("auth.devQuick") }}</div>
          <div class="space-y-2">
            <button
              v-for="email in devLoginEmails"
              :key="email"
              class="btn btn-ghost w-full justify-center"
              type="button"
              :disabled="loginBusy"
              @click="applyDevLogin(email)"
            >
              {{ t("auth.signInAs", { email }) }}
            </button>
          </div>
        </div>
        <div v-if="loginError" class="text-status-offline text-xs text-center mt-4">
          {{ loginError }}
        </div>
        <div class="text-white/40 text-xs text-center mt-4">
          {{ hasLoginOption ? t("auth.ssoHint") : t("auth.unavailable") }}
        </div>
        <div v-if="!hasLoginOption" class="text-white/30 text-xs text-center mt-2">
          {{ t("auth.unavailableHint") }}
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="spaces-loading">
      <div class="skeleton-shell">
        <div class="skeleton-header">
          <div class="skeleton-pill"></div>
          <div class="skeleton-lines">
            <span class="skeleton-line w-40"></span>
            <span class="skeleton-line w-24"></span>
          </div>
        </div>
        <div class="skeleton-grid">
          <div v-for="idx in 6" :key="`skeleton-${idx}`" class="skeleton-card"></div>
        </div>
      </div>
    </div>

    <div v-else-if="!me && spaces.length === 0" class="empty-workspace-container">
      <div class="empty-workspace-hero guest-hero" :class="{ 'animate-fade-in-scale': performanceMode !== 'low' }">
        <div class="empty-workspace-icon">
          <Layout class="w-12 h-12 text-accent" />
        </div>
        <h2 class="empty-workspace-title">{{ t("guest.title") }}</h2>
        <p class="empty-workspace-description">
          {{ t("guest.body") }}
        </p>

        <div class="guest-notes">
          <div class="guest-note-card">
            <div class="guest-note-label">{{ t("guest.availableTitle") }}</div>
            <div class="guest-note-body">{{ t("guest.availableNone") }}</div>
          </div>
          <div class="guest-note-card">
            <div class="guest-note-label">{{ t("guest.valueTitle") }}</div>
            <div class="guest-note-body">{{ t("guest.valueBody") }}</div>
          </div>
          <div class="guest-note-card">
            <div class="guest-note-label">{{ t("guest.controlTitle") }}</div>
            <div class="guest-note-body">{{ t("guest.controlBody") }}</div>
          </div>
          <div class="guest-note-card">
            <div class="guest-note-label">{{ t("guest.accessStepsTitle") }}</div>
            <div class="guest-note-body">{{ t("guest.accessStepsBody") }}</div>
          </div>
        </div>

        <a class="btn btn-primary mt-6" :href="loginPageUrl">
          {{ t("guest.loginCta") }}
        </a>
      </div>
    </div>

    <div v-else-if="spaces.length === 0 && me && !isAdmin" class="empty-workspace-container">
      <div class="empty-workspace-hero" :class="{ 'animate-fade-in-scale': performanceMode !== 'low' }">
        <div class="empty-workspace-icon">
          <Users class="w-12 h-12 text-accent" />
        </div>
        <h2 class="empty-workspace-title">{{ t("app.noAccessTitle") }}</h2>
        <p class="empty-workspace-description">
          {{ t("app.noAccessBody") }}
        </p>

        <div class="guest-notes">
          <div class="guest-note-card">
            <div class="guest-note-label">{{ t("app.noAccessRoleTitle") }}</div>
            <div class="guest-note-body">
              {{ t("app.noAccessSpaces", { role: effectiveRole || actualRole || 'guest' }) }}
            </div>
          </div>
          <div class="guest-note-card">
            <div class="guest-note-label">{{ t("app.noAccessHelpTitle") }}</div>
            <div class="guest-note-body">{{ t("app.noAccessHelpBody") }}</div>
          </div>
          <div class="guest-note-card">
            <div class="guest-note-label">{{ t("app.noAccessTrustTitle") }}</div>
            <div class="guest-note-body">{{ t("guest.trustNote") }}</div>
          </div>
        </div>

        <button class="btn btn-primary mt-6" @click="logout">
          {{ t("app.logout") }}
        </button>
      </div>
    </div>

    <div v-else-if="spaces.length === 0 && isAdmin && !showAdmin" class="empty-workspace-container">
      <div class="empty-workspace-hero" :class="{ 'animate-fade-in-scale': performanceMode !== 'low' }">
        <div class="empty-workspace-icon">
          <Layout class="w-12 h-12 text-accent" />
        </div>
        <h2 class="empty-workspace-title">{{ t("spaces.welcomeTitle") }}</h2>
        <p class="empty-workspace-description">
          {{ t("spaces.welcomeBody") }}
        </p>

        <div class="empty-workspace-presets">
          <div class="preset-card" @click="navigateToAdmin('spaces')">
            <div class="preset-icon">🏠</div>
            <div class="preset-title">{{ t("spaces.family") }}</div>
            <div class="preset-desc">{{ t("spaces.familyDesc") }}</div>
          </div>
        </div>

        <button
          class="btn btn-primary mt-6"
          @click="navigateToAdmin('spaces')"
        >
          <Settings class="w-4 h-4" />
          {{ t("spaces.openAdmin") }}
        </button>

        <div class="empty-workspace-hints">
          <p class="text-white/40 text-sm mt-4">
            {{ t("spaces.adminHint") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Full-Screen Admin Panel -->
    <div v-else-if="showAdmin && me && isAdmin" class="admin-section">
      <div class="admin-sidebar">
        <div class="admin-sidebar-header">
          <button class="admin-back-btn" @click="navigateHome()">
            <ChevronLeft class="w-5 h-5" />
            <span>{{ t("app.back") }}</span>
          </button>
        </div>
        <nav class="admin-nav">
          <button 
            class="admin-nav-item" 
            :class="{ active: adminTab === 'spaces' }"
            @click="navigateToAdmin('spaces')"
          >
            <Layout class="w-4 h-4" />
            <span>{{ t("admin.title.spaces") }}</span>
            <span class="admin-nav-badge muted">{{ spacesAdmin.length }}</span>
          </button>
          <button 
            class="admin-nav-item" 
            :class="{ active: adminTab === 'members' }"
            @click="navigateToAdmin('members')"
          >
            <Users class="w-4 h-4" />
            <span>{{ t("admin.title.members") }}</span>
          </button>
          <button 
            class="admin-nav-item" 
            :class="{ active: adminTab === 'content' }"
            @click="navigateToAdmin('content')"
          >
            <FileText class="w-4 h-4" />
            <span>{{ t("admin.title.content") }}</span>
          </button>
          <button 
            class="admin-nav-item" 
            :class="{ active: adminTab === 'dashboard' }"
            @click="navigateToAdmin('dashboard')"
          >
            <Grid3X3 class="w-4 h-4" />
            <span>{{ t("admin.title.dashboard") }}</span>
          </button>
        </nav>
      <div class="admin-sidebar-footer">
          <div class="text-xs text-white/30">{{ t("app.adminPanel") }}</div>
        </div>
      </div>
      
      <div class="admin-content">
        <div class="admin-content-header">
          <div class="admin-content-heading">
            <h1 class="admin-content-title">
              <template v-if="adminTab === 'spaces'">{{ t("admin.title.spaces") }}</template>
              <template v-else-if="adminTab === 'members'">{{ t("admin.title.members") }}</template>
              <template v-else-if="adminTab === 'content'">{{ t("admin.title.content") }}</template>
              <template v-else-if="adminTab === 'dashboard'">{{ t("admin.title.dashboard") }}</template>
            </h1>
            <p class="admin-content-subtitle">
              <template v-if="adminTab === 'spaces'">{{ t("admin.subtitle.spaces") }}</template>
              <template v-else-if="adminTab === 'members'">{{ t("admin.subtitle.members") }}</template>
              <template v-else-if="adminTab === 'content'">{{ t("admin.subtitle.content") }}</template>
              <template v-else-if="adminTab === 'dashboard'">{{ t("admin.subtitle.dashboard") }}</template>
            </p>
          </div>
          <div class="admin-content-actions">
            <button
              class="btn btn-ghost text-xs"
              :disabled="reloadConfigPending"
              @click="reloadConfig"
            >
              {{ reloadConfigPending ? t("admin.reloading") : t("admin.reload") }}
            </button>
          </div>
        </div>
        
        <div class="admin-content-body">
          <!-- Spaces Tab -->
          <template v-if="adminTab === 'spaces'">
            <div class="admin-grid-2">
              <div class="admin-card">
                <h4 class="font-medium mb-4">{{ t("admin.spaces.create") }}</h4>
                <div class="space-y-3">
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.title") }}</label>
                    <input v-model="newSpace.title" class="input" :placeholder="t('admin.spaces.placeholder.title')" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.description") }}</label>
                    <input v-model="newSpace.description" class="input" :placeholder="t('admin.spaces.placeholder.description')" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.slug") }}</label>
                    <input v-model="newSpace.slug" class="input" :placeholder="t('admin.spaces.placeholder.slug')" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.visibilityGroups") }}</label>
                    <input v-model="newSpace.visibilityGroups" class="input" :placeholder="t('admin.spaces.placeholder.visibilityGroups')" />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.type") }}</label>
                      <select v-model="newSpace.type" class="select w-full text-sm">
                        <option value="audience">{{ t("admin.spaces.option.type.audience") }}</option>
                        <option value="shared">{{ t("admin.spaces.option.type.shared") }}</option>
                        <option value="system">{{ t("admin.spaces.option.type.system") }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.parent") }}</label>
                      <select v-model="newSpace.parentId" class="select w-full text-sm">
                        <option value="">{{ t("admin.spaces.option.parentNone") }}</option>
                        <option v-for="space in spacesAdmin" :key="space.id" :value="space.id">
                          {{ space.title }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.dashboardTemplate") }}</label>
                    <select v-model="newSpace.dashboardTemplateId" class="select w-full text-sm">
                      <option value="">{{ t("admin.spaces.option.templateAuto") }}</option>
                      <option v-for="tmpl in dashboardTemplates" :key="tmpl.id" :value="tmpl.id">
                        {{ tmpl.key }} (v{{ tmpl.version }})
                      </option>
                    </select>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.layoutMode") }}</label>
                      <select v-model="newSpace.layoutMode" class="select w-full text-sm">
                        <option value="grid">{{ t("admin.spaces.option.layout.grid") }}</option>
                        <option value="hero">{{ t("admin.spaces.option.layout.hero") }}</option>
                        <option value="list">{{ t("admin.spaces.option.layout.list") }}</option>
                      </select>
                    </div>
                    <div class="flex items-end">
                      <label class="flex items-center gap-2 text-xs text-white/60">
                        <input v-model="newSpace.isLockable" type="checkbox" class="accent-white/70" />
                        {{ t("admin.spaces.lockable") }}
                      </label>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.accessMode") }}</label>
                      <select v-model="newSpace.accessMode" class="select w-full text-sm">
                        <option value="private">{{ t("admin.spaces.option.access.private") }}</option>
                        <option value="public_readonly">{{ t("admin.spaces.option.access.publicReadonly") }}</option>
                      </select>
                    </div>
                    <div class="flex items-end">
                      <label class="flex items-center gap-2 text-xs text-white/60">
                        <input
                          v-model="newSpace.isDefaultPublicEntry"
                          :disabled="newSpace.accessMode !== 'public_readonly'"
                          type="checkbox"
                          class="accent-white/70 disabled:opacity-40"
                        />
                        {{ t("admin.spaces.defaultPublicEntry") }}
                      </label>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.backgroundUrl") }}</label>
                    <input v-model="newSpace.backgroundUrl" class="input" :placeholder="t('admin.spaces.placeholder.backgroundUrl')" />
                  </div>
                  <div class="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div class="text-[11px] uppercase tracking-wider text-white/40">{{ t("admin.spaces.field.publicEntry") }}</div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryTitle") }}</label>
                      <input v-model="newSpace.publicEntryTitle" class="input" :placeholder="t('admin.spaces.placeholder.publicEntryTitle')" />
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntrySubtitle") }}</label>
                      <textarea v-model="newSpace.publicEntrySubtitle" class="input font-mono text-xs" rows="2" :placeholder="t('admin.spaces.placeholder.publicEntrySubtitle')"></textarea>
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryHelp") }}</label>
                      <textarea v-model="newSpace.publicEntryHelp" class="input font-mono text-xs" rows="2" :placeholder="t('admin.spaces.placeholder.publicEntryHelp')"></textarea>
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryContact") }}</label>
                      <textarea v-model="newSpace.publicEntryContact" class="input font-mono text-xs" rows="2" :placeholder="t('admin.spaces.placeholder.publicEntryContact')"></textarea>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.displayConfig") }}</label>
                    <textarea v-model="newSpace.displayConfig" class="input font-mono text-xs" rows="2"></textarea>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.personalizationRules") }}</label>
                    <textarea v-model="newSpace.personalizationRules" class="input font-mono text-xs" rows="2"></textarea>
                  </div>
                  <button class="btn btn-primary w-full" @click="createSpace">{{ t("admin.spaces.createAction") }}</button>
                </div>
              </div>

              <div class="admin-card">
                <h4 class="font-medium mb-4">{{ t("admin.spaces.active") }}</h4>
                <div v-if="spacesAdmin.length === 0" class="text-white/30 text-sm py-4">
                  {{ t("app.noSpaces") }}
                </div>
                <div v-else class="space-y-1">
                  <div
                    v-for="space in spacesAdmin"
                    :key="space.id"
                    class="admin-list-item"
                  >
                    <div>
                      <div class="font-medium text-sm">{{ space.title }}</div>
                      <div class="text-[11px] text-white/30">{{ space.slug }}</div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button class="btn btn-ghost text-xs" @click="startEditSpace(space)">
                        {{ t("admin.spaces.edit") }}
                      </button>
                      <button class="btn btn-ghost text-xs" @click="archiveSpace(space)">
                        {{ t("admin.spaces.archive") }}
                      </button>
                      <button class="btn btn-ghost btn-danger text-xs" @click="deleteSpace(space)">
                        {{ t("admin.spaces.delete") }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="archivedSpacesAdmin.length > 0" class="admin-card">
                <h4 class="font-medium mb-4">{{ t("admin.spaces.archived") }}</h4>
                <div class="space-y-1">
                  <div
                    v-for="space in archivedSpacesAdmin"
                    :key="space.id"
                    class="admin-list-item"
                  >
                    <div>
                      <div class="font-medium text-sm">{{ space.title }}</div>
                      <div class="text-[11px] text-white/30">{{ space.slug }}</div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button class="btn btn-ghost text-xs" @click="restoreSpace(space)">
                        {{ t("admin.spaces.restore") }}
                      </button>
                      <button class="btn btn-ghost btn-danger text-xs" @click="deleteSpace(space)">
                        {{ t("admin.spaces.delete") }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Edit Space Modal (nested) -->
            <div v-if="editSpace" class="modal-backdrop" @click.self="editSpace = null">
              <div class="modal-content">
                <h4 class="font-medium mb-4">{{ t("admin.spaces.editTitle") }}</h4>
                <div class="space-y-3">
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.title") }}</label>
                    <input v-model="editSpace.title" class="input" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.description") }}</label>
                    <input v-model="editSpace.description" class="input" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.slug") }}</label>
                    <input v-model="editSpace.slug" class="input" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.visibilityGroups") }}</label>
                    <input v-model="editSpace.visibilityGroups" class="input" :placeholder="t('admin.spaces.placeholder.visibilityGroups')" />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.type") }}</label>
                      <select v-model="editSpace.type" class="select w-full text-sm">
                        <option value="audience">{{ t("admin.spaces.option.type.audience") }}</option>
                        <option value="shared">{{ t("admin.spaces.option.type.shared") }}</option>
                        <option value="system">{{ t("admin.spaces.option.type.system") }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.parent") }}</label>
                      <select v-model="editSpace.parentId" class="select w-full text-sm">
                        <option value="">{{ t("admin.spaces.option.parentNone") }}</option>
                        <option v-for="space in spacesAdmin" :key="space.id" :value="space.id" :disabled="space.id === editSpace.id">
                          {{ space.title }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.dashboardTemplate") }}</label>
                    <select v-model="editSpace.dashboardTemplateId" class="select w-full text-sm">
                      <option value="">{{ t("admin.spaces.option.templateAuto") }}</option>
                      <option v-for="tmpl in dashboardTemplates" :key="tmpl.id" :value="tmpl.id">
                        {{ tmpl.key }} (v{{ tmpl.version }})
                      </option>
                    </select>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.layoutMode") }}</label>
                      <select v-model="editSpace.layoutMode" class="select w-full text-sm">
                        <option value="grid">{{ t("admin.spaces.option.layout.grid") }}</option>
                        <option value="hero">{{ t("admin.spaces.option.layout.hero") }}</option>
                        <option value="list">{{ t("admin.spaces.option.layout.list") }}</option>
                      </select>
                    </div>
                    <div class="flex items-end">
                      <label class="flex items-center gap-2 text-xs text-white/60">
                        <input v-model="editSpace.isLockable" type="checkbox" class="accent-white/70" />
                        {{ t("admin.spaces.lockable") }}
                      </label>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.accessMode") }}</label>
                      <select v-model="editSpace.accessMode" class="select w-full text-sm">
                        <option value="private">{{ t("admin.spaces.option.access.private") }}</option>
                        <option value="public_readonly">{{ t("admin.spaces.option.access.publicReadonly") }}</option>
                      </select>
                    </div>
                    <div class="flex items-end">
                      <label class="flex items-center gap-2 text-xs text-white/60">
                        <input
                          v-model="editSpace.isDefaultPublicEntry"
                          :disabled="editSpace.accessMode !== 'public_readonly'"
                          type="checkbox"
                          class="accent-white/70 disabled:opacity-40"
                        />
                        {{ t("admin.spaces.defaultPublicEntry") }}
                      </label>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.backgroundUrl") }}</label>
                    <input v-model="editSpace.backgroundUrl" class="input" />
                  </div>
                  <div class="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div class="text-[11px] uppercase tracking-wider text-white/40">{{ t("admin.spaces.field.publicEntry") }}</div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryTitle") }}</label>
                      <input v-model="editSpace.publicEntryTitle" class="input" />
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntrySubtitle") }}</label>
                      <textarea v-model="editSpace.publicEntrySubtitle" class="input font-mono text-xs" rows="2"></textarea>
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryHelp") }}</label>
                      <textarea v-model="editSpace.publicEntryHelp" class="input font-mono text-xs" rows="2"></textarea>
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryContact") }}</label>
                      <textarea v-model="editSpace.publicEntryContact" class="input font-mono text-xs" rows="2"></textarea>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.displayConfig") }}</label>
                    <textarea v-model="editDisplayConfig" class="input font-mono text-xs" rows="4"></textarea>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.personalizationRules") }}</label>
                    <textarea v-model="editPersonalizationRules" class="input font-mono text-xs" rows="4"></textarea>
                  </div>
                  <div class="flex items-center gap-2 pt-2">
                    <button class="btn btn-primary flex-1" @click="updateSpace">{{ t("app.save") }}</button>
                    <button class="btn btn-ghost" @click="editSpace = null">{{ t("app.cancel") }}</button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Members Tab -->
          <template v-else-if="adminTab === 'members'">
            <div class="admin-card">
              <h4 class="font-medium mb-4">{{ t("admin.members.title") }}</h4>
              <div class="admin-grid-2 mb-6">
                <div class="space-y-3">
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.space") }}</label>
                    <select v-model="membershipSpaceId" class="select w-full text-sm" @change="onMembershipSpaceChange">
                      <option value="">{{ t("admin.common.selectSpace") }}</option>
                      <option v-for="space in spacesAdmin" :key="space.id" :value="space.id">
                        {{ space.title }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.email") }}</label>
                    <input v-model="membershipForm.email" class="input" :placeholder="t('admin.common.placeholder.email')" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.role") }}</label>
                    <select v-model="membershipForm.roleId" class="select w-full text-sm">
                      <option value="">{{ t("admin.common.selectRole") }}</option>
                      <option v-for="role in roles" :key="role.id" :value="role.id">
                        {{ role.name }} ({{ role.key }})
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.segment") }}</label>
                    <input
                      v-model="membershipForm.userSegment"
                      class="input"
                      :placeholder="t('admin.common.placeholder.segment')"
                      list="membership-segments"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.validUntil") }}</label>
                    <input v-model="membershipForm.validTo" type="datetime-local" class="input" />
                  </div>
                  <button class="btn btn-primary w-full" @click="addMembership">{{ t("admin.members.add") }}</button>
                </div>
                <div class="space-y-3">
                  <div class="text-[11px] text-white/40 uppercase tracking-wider">{{ t("admin.common.bulkImport") }}</div>
                  <textarea v-model="membershipBulk.emails" class="input font-mono text-xs" rows="4" :placeholder="t('admin.common.placeholder.emails')"></textarea>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.role") }}</label>
                      <select v-model="membershipBulk.roleId" class="select w-full text-sm">
                        <option value="">{{ t("admin.common.selectRole") }}</option>
                        <option v-for="role in roles" :key="role.id" :value="role.id">
                          {{ role.name }} ({{ role.key }})
                        </option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.validUntil") }}</label>
                      <input v-model="membershipBulk.validTo" type="datetime-local" class="input" />
                    </div>
                    <button class="btn btn-ghost w-full col-span-2" @click="importMemberships">{{ t("admin.common.import") }}</button>
                  </div>
                </div>
              </div>
              <div v-if="memberships.length === 0" class="text-white/30 text-sm py-4">
                {{ t("admin.members.none") }}
              </div>
              <div v-else class="space-y-2">
                <datalist id="membership-segments">
                  <option v-for="seg in membershipSegmentOptions" :key="seg" :value="seg"></option>
                </datalist>
                <div
                  v-for="member in memberships"
                  :key="`${member.principal_id}-${member.space_id}`"
                  class="admin-list-item"
                >
                  <div>
                    <div class="font-medium text-sm">{{ member.email }}</div>
                    <div class="text-[11px] text-white/40">
                      {{ member.role_name }} · {{ member.role_key }}
                      <span v-if="member.user_segment"> · {{ member.user_segment }}</span>
                      <span v-if="member.valid_to"> · {{ t("admin.members.until", { date: new Date(member.valid_to).toLocaleString() }) }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      v-model="member.user_segment"
                      class="input text-xs w-28"
                      :placeholder="t('admin.segment')"
                      list="membership-segments"
                    />
                    <button class="btn btn-ghost text-xs" @click="updateMemberSegment(member)">{{ t("app.save") }}</button>
                    <button class="btn btn-ghost text-xs" @click="removeMembership(member)">{{ t("admin.common.remove") }}</button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Content Tab -->
          <template v-else-if="adminTab === 'content'">
            <div class="admin-grid-2">
              <div class="admin-card">
                <h4 class="font-medium mb-4">{{ t("admin.content.directory") }}</h4>
                <div class="space-y-3 mb-6">
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.space") }}</label>
                    <select v-model="contentSpaceId" class="select w-full text-sm" @change="onContentSpaceChange">
                      <option value="">{{ t("admin.common.selectSpace") }}</option>
                      <option v-for="space in spacesAdmin" :key="space.id" :value="space.id">
                        {{ space.title }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.title") }}</label>
                    <input v-model="directoryForm.title" class="input" :placeholder="t('admin.common.placeholder.title')" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.description") }}</label>
                    <input v-model="directoryForm.description" class="input" :placeholder="t('admin.common.placeholder.description')" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.iconUrl") }}</label>
                    <input
                      v-model="directoryForm.iconUrl"
                      class="input"
                      :placeholder="t('admin.common.placeholder.iconUrl')"
                      @blur="directoryForm.iconUrl = normalizeIconUrl(directoryForm.iconUrl)"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.url") }}</label>
                    <input v-model="directoryForm.url" class="input" :placeholder="t('admin.common.placeholder.url')" />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.type") }}</label>
                      <select v-model="directoryForm.type" class="select w-full text-sm">
                        <option value="resource">{{ t("admin.common.option.type.resource") }}</option>
                        <option value="link">{{ t("admin.common.option.type.link") }}</option>
                        <option value="action">{{ t("admin.common.option.type.action") }}</option>
                      </select>
                    </div>
                    <div class="flex items-end">
                      <label class="flex items-center gap-2 text-xs text-white/60">
                        <input v-model="directoryForm.pinned" type="checkbox" class="accent-white/70" />
                        {{ t("admin.common.pinned") }}
                      </label>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.tags") }}</label>
                    <input v-model="directoryForm.tags" class="input text-xs" :placeholder="t('admin.common.placeholder.tags')" />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.serviceType") }}</label>
                      <input v-model="directoryForm.serviceType" class="input text-xs" :placeholder="t('admin.common.placeholder.serviceType')" />
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.tier") }}</label>
                      <input v-model="directoryForm.tier" class="input text-xs" :placeholder="t('admin.common.placeholder.tier')" />
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.lifecycle") }}</label>
                      <input v-model="directoryForm.lifecycle" class="input text-xs" :placeholder="t('admin.common.placeholder.lifecycle')" />
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.classification") }}</label>
                      <input v-model="directoryForm.classification" class="input text-xs" :placeholder="t('admin.common.placeholder.classification')" />
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.runbookUrl") }}</label>
                    <input v-model="directoryForm.runbookUrl" class="input text-xs" :placeholder="t('admin.common.placeholder.runbookUrl')" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.accessPath") }}</label>
                    <input v-model="directoryForm.accessPath" class="input text-xs" :placeholder="t('admin.common.placeholder.accessPath')" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.dependsOn") }}</label>
                    <input v-model="directoryForm.dependsOn" class="input text-xs" :placeholder="t('admin.common.placeholder.dependsOn')" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.ownersJson") }}</label>
                    <textarea v-model="directoryForm.owners" class="input text-xs" rows="3" :placeholder="t('admin.common.placeholder.ownersJson')"></textarea>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.linksJson") }}</label>
                    <textarea v-model="directoryForm.links" class="input text-xs" rows="3" :placeholder="t('admin.common.placeholder.linksJson')"></textarea>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.endpointsJson") }}</label>
                    <textarea v-model="directoryForm.endpoints" class="input text-xs" rows="3" :placeholder="t('admin.common.placeholder.endpointsJson')"></textarea>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.audienceGroups") }}</label>
                    <input v-model="directoryForm.audienceGroups" class="input text-xs" placeholder="admin, user, guest" />
                  </div>
                  <button class="btn btn-primary w-full" @click="createDirectoryItem">{{ t("admin.common.create") }}</button>
                </div>
                <div v-if="directoryAdmin.length === 0" class="text-white/30 text-sm py-4">
                  {{ t("admin.content.noneDirectory") }}
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="item in directoryAdmin"
                    :key="item.id"
                    class="admin-list-item flex-col items-start"
                  >
                    <div class="flex items-center justify-between w-full">
                      <div class="font-medium text-sm truncate">{{ item.title }}</div>
                      <div class="flex items-center gap-2">
                        <button v-if="ENABLE_V0_RESOURCE_DETAILS" class="btn btn-ghost text-xs" @click="openServiceDetails(item)">{{ t("app.details") }}</button>
                        <button class="btn btn-ghost text-xs" @click="deleteDirectoryItem(item)">{{ t("admin.spaces.delete") }}</button>
                      </div>
                    </div>
                    <div class="text-[11px] text-white/40 mt-1 truncate">{{ item.url }}</div>
                    <div class="flex items-center gap-2 mt-2 w-full">
                      <span class="chip chip-muted">{{ item.type }}</span>
                      <span v-if="item.serviceType" class="chip chip-muted">{{ item.serviceType }}</span>
                      <span v-if="item.tier" class="chip chip-muted">{{ item.tier }}</span>
                      <label class="flex items-center gap-2 text-[11px] text-white/50">
                        <input v-model="item.pinned" type="checkbox" class="accent-white/70" />
                        {{ t("admin.common.pinned") }}
                      </label>
                      <input v-model="item.description" class="input text-xs mt-2" placeholder="description" />
                      <input
                        v-model="item.icon_url"
                        class="input text-xs mt-2"
                        placeholder="printer or /icons/printer.svg"
                        @blur="item.icon_url = normalizeIconUrl(item.icon_url)"
                      />
                      <input v-model="item.tagsInput" class="input text-xs mt-2" placeholder="tags" />
                      <input v-model="item.actionKeysInput" class="input text-xs mt-2" placeholder="action keys" />
                      <input v-model="item.audienceInput" class="input text-xs mt-2" placeholder="audience groups" />
                      <button class="btn btn-ghost text-xs mt-2" @click="updateDirectoryItem(item)">{{ t("app.save") }}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Services Tab -->
          <template v-else-if="adminTab === 'services'">
            <div class="admin-grid-2">
              <div class="admin-card">
                <h4 class="font-medium mb-4">{{ t("admin.services.catalog") }}</h4>
                <div class="space-y-3 mb-6">
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.key") }}</label>
                    <input v-model="serviceForm.key" class="input" placeholder="billing-api" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.title") }}</label>
                    <input v-model="serviceForm.title" class="input" placeholder="Billing API" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.description") }}</label>
                    <input v-model="serviceForm.description" class="input" placeholder="What this service does" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.iconUrl") }}</label>
                    <input
                      v-model="serviceForm.iconUrl"
                      class="input"
                      :placeholder="t('admin.common.placeholder.iconUrl')"
                      @blur="serviceForm.iconUrl = normalizeIconUrl(serviceForm.iconUrl)"
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.serviceType") }}</label>
                      <input v-model="serviceForm.serviceType" class="input text-xs" :placeholder="t('admin.common.placeholder.serviceType')" />
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.tier") }}</label>
                      <input v-model="serviceForm.tier" class="input text-xs" :placeholder="t('admin.common.placeholder.tier')" />
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.lifecycle") }}</label>
                      <input v-model="serviceForm.lifecycle" class="input text-xs" :placeholder="t('admin.common.placeholder.lifecycle')" />
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.classification") }}</label>
                      <input v-model="serviceForm.classification" class="input text-xs" :placeholder="t('admin.common.placeholder.classification')" />
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.tags") }}</label>
                    <input v-model="serviceForm.tags" class="input text-xs" :placeholder="t('admin.common.placeholder.tags')" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.dependsOn") }}</label>
                    <input v-model="serviceForm.dependsOn" class="input text-xs" :placeholder="t('admin.common.placeholder.dependsOn')" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.ownersJson") }}</label>
                    <textarea v-model="serviceForm.owners" class="input text-xs" rows="3" :placeholder="t('admin.common.placeholder.ownersJson')"></textarea>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.linksJson") }}</label>
                    <textarea v-model="serviceForm.links" class="input text-xs" rows="3" :placeholder="t('admin.common.placeholder.linksJson')"></textarea>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.endpointsJson") }}</label>
                    <textarea v-model="serviceForm.endpoints" class="input text-xs" rows="3" :placeholder="t('admin.common.placeholder.endpointsJson')"></textarea>
                  </div>
                  <button class="btn btn-primary w-full" @click="createService">{{ t("admin.services.create") }}</button>
                </div>
                <div v-if="servicesAdmin.length === 0" class="text-white/30 text-sm py-4">
                  {{ t("admin.services.none") }}
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="item in servicesAdmin"
                    :key="item.id"
                    class="admin-list-item"
                  >
                    <div>
                      <div class="font-medium text-sm">{{ item.title }}</div>
                      <div class="text-[11px] text-white/30">{{ item.key }}</div>
                      <div class="text-[11px] text-white/40 mt-1">
                        <span v-if="item.serviceType">{{ item.serviceType }}</span>
                        <span v-if="item.tier"> · {{ item.tier }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button class="btn btn-ghost text-xs" @click="openServiceEdit(item)">{{ t("admin.services.edit") }}</button>
                      <button class="btn btn-ghost btn-danger text-xs" @click="deleteService(item)">{{ t("admin.spaces.delete") }}</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="admin-card">
                <h4 class="font-medium mb-4">{{ t("admin.placements.title") }}</h4>
                <div class="space-y-3 mb-6">
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.placements.spaceFilter") }}</label>
                      <select v-model="placementSpaceId" class="select w-full text-sm">
                        <option value="">{{ t("admin.common.allSpaces") }}</option>
                        <option v-for="space in spacesAdmin" :key="space.id" :value="space.id">
                          {{ space.title }}
                        </option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.placements.serviceFilter") }}</label>
                      <select v-model="placementServiceKey" class="select w-full text-sm">
                        <option value="">{{ t("admin.common.allServices") }}</option>
                        <option v-for="service in servicesAdmin" :key="service.id" :value="service.key">
                          {{ service.title }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.space") }}</label>
                      <select v-model="placementForm.spaceId" class="select w-full text-sm">
                        <option value="">{{ t("admin.common.selectSpace") }}</option>
                        <option v-for="space in spacesAdmin" :key="space.id" :value="space.id">
                          {{ space.title }}
                        </option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.service") }}</label>
                      <select v-model="placementForm.serviceKey" class="select w-full text-sm">
                        <option value="">{{ t("admin.common.selectService") }}</option>
                        <option v-for="service in servicesAdmin" :key="service.id" :value="service.key">
                          {{ service.title }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.label") }}</label>
                    <input v-model="placementForm.label" class="input text-xs" placeholder="Billing (primary)" />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.group") }}</label>
                      <input v-model="placementForm.group" class="input text-xs" placeholder="Payments" />
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.order") }}</label>
                      <input v-model.number="placementForm.order" type="number" min="0" class="input text-xs" />
                    </div>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-white/60">
                    <input v-model="placementForm.pinned" type="checkbox" class="accent-white/70" />
                    {{ t("admin.common.pinned") }}
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.primaryUrl") }}</label>
                    <input v-model="placementForm.primaryUrl" class="input text-xs" placeholder="https://..." />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.defaultEndpoint") }}</label>
                      <input v-model="placementForm.defaultEndpoint" class="input text-xs" placeholder="public" />
                    </div>
                    <div>
                      <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.accessPath") }}</label>
                      <input v-model="placementForm.accessPath" class="input text-xs" :placeholder="t('admin.common.placeholder.accessPath')" />
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.audienceGroups") }}</label>
                    <input v-model="placementForm.audienceGroups" class="input text-xs" placeholder="admin, user, guest" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.allowedActions") }}</label>
                    <input v-model="placementForm.allowedActions" class="input text-xs" placeholder="open, request_access" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.visibleLinks") }}</label>
                    <input v-model="placementForm.visibleLinks" class="input text-xs" placeholder="docs, runbook, repo" />
                  </div>
                  <button class="btn btn-primary w-full" @click="createPlacement">{{ t("admin.placements.create") }}</button>
                </div>
                <div v-if="placementsAdmin.length === 0" class="text-white/30 text-sm py-4">
                  {{ t("admin.placements.none") }}
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="item in placementsAdmin"
                    :key="item.id"
                    class="admin-list-item flex-col items-start"
                  >
                    <div class="flex items-center justify-between w-full">
                      <div>
                        <div class="font-medium text-sm">{{ item.service_key }}</div>
                        <div class="text-[11px] text-white/40">
                          {{ item.space_slug || `space:${item.space_id}` }}
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <button class="btn btn-ghost text-xs" @click="updatePlacement(item)">{{ t("app.save") }}</button>
                        <button class="btn btn-ghost btn-danger text-xs" @click="deletePlacement(item)">{{ t("admin.spaces.delete") }}</button>
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 w-full mt-2">
                      <input v-model="item.label" class="input text-xs" placeholder="label" />
                      <input v-model="item.group" class="input text-xs" placeholder="group" />
                      <input v-model.number="item.order" type="number" min="0" class="input text-xs" />
                      <label class="flex items-center gap-2 text-xs text-white/60">
                        <input v-model="item.pinned" type="checkbox" class="accent-white/70" />
                        {{ t("admin.common.pinned") }}
                      </label>
                    </div>
                    <div class="grid grid-cols-2 gap-2 w-full mt-2">
                      <input v-model="item.primary_url" class="input text-xs" placeholder="primary url" />
                      <input v-model="item.default_endpoint" class="input text-xs" placeholder="default endpoint" />
                    </div>
                    <div class="mt-2 w-full">
                      <input v-model="item.access_path" class="input text-xs" placeholder="access path" />
                    </div>
                    <div class="mt-2 w-full">
                      <input v-model="item.audienceInput" class="input text-xs" placeholder="audience groups" />
                    </div>
                    <div class="grid grid-cols-2 gap-2 w-full mt-2">
                      <input v-model="item.allowedActionsInput" class="input text-xs" placeholder="allowed actions" />
                      <input v-model="item.visibleLinksInput" class="input text-xs" placeholder="visible links" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Dashboard Tab -->
          <template v-else-if="adminTab === 'dashboard'">
            <div class="admin-card">
              <h4 class="font-medium mb-4">{{ t("admin.dashboard.templates") }}</h4>
              <div v-if="spacesAdmin.length === 0" class="text-white/30 text-sm py-4">
                {{ t("app.noSpaces") }}
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="space in spacesAdmin"
                  :key="space.id"
                  class="admin-list-item"
                >
                  <div>
                    <div class="font-medium text-sm">{{ space.title }}</div>
                    <div class="text-[11px] text-white/30">
                      {{ t("admin.dashboard.blocksCount", { count: blocksForSpace(space.id).length }) }}
                    </div>
                  </div>
                  <button
                    class="btn btn-ghost text-xs"
                    @click="openDashboardEditor(space)"
                  >
                    {{ t("admin.dashboard.editBlocks") }}
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <section
      v-else
      ref="stageRef"
      class="stage-scroll"
      :class="{ 'stage-scroll-low': performanceMode === 'low' }"
      @scroll.passive="updateIndex"
    >
      <div v-if="!me" class="mb-5">
        <div class="card-glass p-5 sm:p-6 border border-white/10">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="max-w-2xl">
              <div class="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-3">
                {{ t("guest.publicShellTitle") }}
              </div>
              <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-white/95">
                {{ spacePublicTitle(guestFocusSpace) || t("guest.title") }}
              </h2>
              <p class="mt-3 text-sm text-white/60 leading-6">
                {{ spaceDescription(guestFocusSpace) || t("guest.publicShellSubtitle") }}
              </p>
              <p v-if="spacePublicHelp(guestFocusSpace)" class="mt-3 text-xs text-white/45 leading-5">
                {{ spacePublicHelp(guestFocusSpace) }}
              </p>
              <p class="mt-3 text-xs text-white/45 leading-5">
                {{ t("guest.trustNote") }}
              </p>
              <div class="guest-notes mt-4">
                <div class="guest-note-card">
                  <div class="guest-note-label">{{ t("guest.valueTitle") }}</div>
                  <div class="guest-note-body">{{ t("guest.valueBody") }}</div>
                </div>
                <div class="guest-note-card">
                  <div class="guest-note-label">{{ t("guest.controlTitle") }}</div>
                  <div class="guest-note-body">{{ t("guest.controlBody") }}</div>
                </div>
                <div class="guest-note-card">
                  <div class="guest-note-label">{{ t("guest.accessStepsTitle") }}</div>
                  <div class="guest-note-body">{{ t("guest.accessStepsBody") }}</div>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-3 sm:items-end">
              <div class="chip chip-muted">{{ spaces.length }} {{ t("app.spaces") }}</div>
              <a class="btn btn-primary" :href="loginPageUrl">{{ t("guest.loginCta") }}</a>
            </div>
          </div>
        </div>
      </div>

      <div
        v-for="(space, sidx) in spaces"
        :key="space.id"
        class="stage-panel"
      >
        <div class="stage-header">
          <div>
            <h2 class="stage-title">{{ space.title }}</h2>
            <div v-if="spaceDescription(space)" class="stage-subtitle">
              {{ spaceDescription(space) }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="ENABLE_V0_EDITOR && canManage && !isMobile && !isDashboardEditing(space) && !isPublicReadonlySpace(space)"
              class="btn btn-ghost"
              @click="toggleDashboardEdit(space)"
            >
              {{ t("app.editLayout") }}
            </button>
          </div>
        </div>

        <div class="grid" :class="gridClass(space)">
          <div v-if="me && surfaceCardsFor(space).length" class="col-span-full">
            <div class="surface-brief">
              <div class="surface-brief-header">
                <div>
                  <div class="surface-brief-title">{{ surfaceHeadingFor(space).title }}</div>
                  <div class="surface-brief-subtitle">{{ surfaceHeadingFor(space).subtitle }}</div>
                </div>
              </div>
              <div class="surface-brief-grid">
                <article
                  v-for="card in surfaceCardsFor(space)"
                  :key="`${space.id}-${card.id}`"
                  class="surface-brief-card"
                >
                  <div class="surface-brief-eyebrow">{{ card.eyebrow }}</div>
                  <div class="surface-brief-card-title">{{ card.title }}</div>
                  <p class="surface-brief-card-body">{{ card.body }}</p>
                  <button
                    v-if="card.actionLabel && card.actionTarget"
                    class="btn btn-ghost text-xs self-start"
                    @click="runSurfaceAction(card)"
                  >
                    {{ card.actionLabel }}
                  </button>
                </article>
              </div>
            </div>
          </div>
          <div v-if="!me && !isPublicReadonlySpace(space)" class="col-span-full">
            <div class="card-glass core-card">
              <div class="section-title">Доступ</div>
              <div class="core-card-title">Войдите, чтобы увидеть содержимое</div>
              <div class="text-white/50 text-sm mt-2">
                Контент и действия доступны после авторизации.
              </div>
              <a class="btn btn-primary mt-4" :href="loginPageUrl">Войти</a>
            </div>
          </div>
          <div v-if="me && (hasDashboard(space) || canManage) && !isPublicReadonlySpace(space)" class="col-span-full">
            <div class="dashboard-header">
              <div class="flex items-center gap-2">
                <span v-if="dashboardLoading[space.id]" class="chip chip-muted">{{ t("app.loading") }}</span>
                <button
                  v-if="ENABLE_V0_EDITOR && canManage && !isMobile && isDashboardEditing(space) && !isPublicReadonlySpace(space)"
                  class="btn"
                  :class="dashboardEditDirty ? 'btn-primary' : 'btn-ghost'"
                  :disabled="dashboardEditorSaving || !dashboardEditDirty"
                  @click="saveDashboardLayout(space)"
                >
                  {{ dashboardEditorSaving ? `${t("app.save")}...` : t("app.save") }}
                </button>
                <button
                  v-if="ENABLE_V0_EDITOR && canManage && !isMobile && isDashboardEditing(space) && !isPublicReadonlySpace(space)"
                  class="btn btn-ghost"
                  @click="openAddBlockPicker"
                >
                  {{ t("app.addBlock") }}
                </button>
                <button
                  v-if="ENABLE_V0_EDITOR && canManage && !isMobile && isDashboardEditing(space) && !isPublicReadonlySpace(space)"
                  class="btn btn-ghost"
                  @click="stopDashboardEdit"
                >
                  {{ t("app.exit") }}
                </button>
              </div>
            </div>
            <div class="dashboard-layout" :class="{ 'dashboard-layout-editing': isDashboardEditing(space) }">
              <div class="dashboard-main">
                <div
                  class="dashboard-grid"
                  :class="{
                    'dashboard-grid-mobile': isMobile,
                    'dashboard-grid-editing': isDashboardEditing(space),
                    'dashboard-grid-dragging': isDashboardEditing(space) && dashboardDragging
                  }"
                  :data-dashboard-grid="space.id"
                >
                  <div
                    v-if="dashboardDragGhost && dashboardDragGhost.spaceId === space.id"
                    class="dashboard-drop-ghost"
                    :style="{
                      gridColumn: `${dashboardDragGhost.x} / span ${dashboardDragGhost.w}`,
                      gridRow: `${dashboardDragGhost.y} / span ${dashboardDragGhost.h}`
                    }"
                  ></div>
                  <div
                    v-if="blocksForSpace(space.id).length === 0 && !isDashboardEditing(space)"
                    class="col-span-full card-glass dashboard-empty"
                  >
                    <div class="section-title">{{ t("app.spaces") }}</div>
                    <div class="core-card-title">{{ t("dashboard.empty.title") }}</div>
                    <div class="text-white/50 text-sm mt-2">
                      {{ t("dashboard.empty.body") }}
                    </div>
                  </div>
                  <div
                    v-for="block in blocksForSpace(space.id)"
                    :key="block.id"
                    class="dashboard-block card-glass"
                    :class="{
                      'dashboard-block-editing': isDashboardEditing(space),
                      'dashboard-block-selected': isDashboardEditing(space) && block.id === dashboardEditSelectedId,
                      'dashboard-block-plain': blockTypeIs(block, BLOCK_TYPES.resourcesPinned)
                    }"
                    :data-space-id="space.id"
                    :data-block-id="block.id"
                    :style="blockStyle(block, blockOrderMapForSpace(space.id))"
                    @click="isDashboardEditing(space) ? setDashboardEditSelection(space.id, block.id) : null"
                  >
                    <div v-if="!blockTypeIs(block, BLOCK_TYPES.resourcesPinned)" class="dashboard-block-header">
                      <div class="dashboard-block-title">{{ blockTitle(block) }}</div>
                      <span class="chip chip-muted">{{ blockTypeLabel(block) }}</span>
                    </div>
                    <div class="dashboard-block-body">
                      <div v-if="blockTypeIs(block, BLOCK_TYPES.resourcesPinned)" class="dashboard-list">
                        <div class="dashboard-resources">
                          <div
                            v-for="item in blockDataFor(space.id, block.id)"
                            :key="item.id"
                            class="resource-card resource-card-tile"
                            :class="{
                              'resource-card-expandable': canOpenResourceDetails(item) && !isPublicReadonlySpace(space),
                              'resource-card-active': resourcePopoverOpen && resourcePopoverItem?.id === item.id
                            }"
                            :data-resource-id="String(item.id)"
                          >
                            <span class="resource-icon resource-icon-tile">
                              <img v-if="resolveIconUrl(item.icon_url)" :src="resolveIconUrl(item.icon_url)" :alt="item.title" />
                              <span v-else>{{ resourceInitial(item) }}</span>
                            </span>
                            <span class="resource-meta">
                              <span class="resource-title-row">
                                <a
                                  v-if="item.url"
                                  :href="item.url"
                                  target="_blank"
                                  rel="noreferrer"
                                  class="resource-title-link"
                                  @click.stop="rememberResourceVisit(space, item)"
                                >
                                  {{ item.title }}
                                </a>
                                <span v-else class="resource-title">{{ item.title }}</span>
                              </span>
                              <template v-if="item.type === 'service'">
                                <span v-if="item.description" class="resource-desc">
                                  {{ item.description }}
                                </span>
                                <span class="flex flex-wrap gap-2 mt-1">
                                  <span v-if="serviceStatusLabel(item)" class="chip">
                                    {{ serviceStatusLabel(item) }}
                                  </span>
                                </span>
                                <div v-if="!isPublicReadonlySpace(space) && normalizeActionKeys(item.action_keys).length" class="flex flex-wrap gap-2 mt-2">
                                  <button
                                    v-for="actionKey in normalizeActionKeys(item.action_keys).slice(0, 4)"
                                    :key="actionKey"
                                    class="btn btn-ghost text-xs"
                                    @click.stop="invokeServiceAction(actionKey, item)"
                                  >
                                    {{ actionLabel(actionKey) || actionKey }}
                                  </button>
                                </div>
                              </template>
                              <span v-else-if="item.description" class="resource-desc">{{ item.description }}</span>
                            </span>
                            <button
                              v-if="ENABLE_V0_RESOURCE_DETAILS && canOpenResourceDetails(item) && !isPublicReadonlySpace(space)"
                              class="resource-detail-toggle"
                              :class="{ active: resourcePopoverOpen && resourcePopoverItem?.id === item.id }"
                              @click.stop="toggleResourcePopover($event, item)"
                            >
                              <span class="resource-detail-toggle-label">{{ t("app.details") }}</span>
                              <ChevronDown class="resource-detail-toggle-icon" />
                            </button>

                            <div
                              v-if="ENABLE_V0_RESOURCE_DETAILS && resourcePopoverOpen && resourcePopoverItem?.id === item.id && !isPublicReadonlySpace(space)"
                              :class="[
                                'resource-popover',
                                'inline',
                                resourcePopoverPlacement === 'right'
                                  ? 'resource-popover-right'
                                  : 'resource-popover-left'
                              ]"
                            >
                              <div class="resource-popover-header">
                                <div class="min-w-0">
                                  <div class="text-xs text-white/50 uppercase tracking-wider">{{ t("resource.details.title") }}</div>
                                  <div class="text-lg font-semibold truncate">{{ resourcePopoverItem.title }}</div>
                                </div>
                                <button class="btn btn-ghost btn-icon" @click="closeResourcePopover">
                                  <Tooltip
                                    :content="t('app.close')"
                                    :disabled="tooltipsDisabled"
                                    :delay="tooltipDelay"
                                  >
                                    <X class="w-4 h-4" />
                                  </Tooltip>
                                </button>
                              </div>

                              <div v-if="resourcePopoverViewer === 'service.s3'" class="resource-popover-body">
                                <div class="drawer-section">
                                  <div class="drawer-section-title">{{ t("resource.details.overview") }}</div>
                                  <div class="drawer-section-body">
                                    <div class="drawer-row">
                                      <span class="drawer-label">{{ t("resource.details.service") }}</span>
                                      <span class="drawer-value">{{ resourcePopoverItem.title }}</span>
                                    </div>
                                    <div v-if="resourcePopoverItem.description" class="drawer-row">
                                      <span class="drawer-label">{{ t("resource.details.description") }}</span>
                                      <span class="drawer-value">{{ resourcePopoverItem.description }}</span>
                                    </div>
                                    <div v-if="resourcePopoverItem.tier" class="drawer-row">
                                      <span class="drawer-label">{{ t("resource.details.tier") }}</span>
                                      <span class="drawer-value">{{ resourcePopoverItem.tier }}</span>
                                    </div>
                                  </div>
                                </div>

                                <div class="drawer-section">
                                  <div class="drawer-section-title">{{ t("resource.details.s3") }}</div>
                                  <div class="drawer-section-body">
                                    <div
                                      v-for="(endpoint, idx) in s3EndpointsFor(resourcePopoverItem)"
                                      :key="`s3-endpoint-${idx}`"
                                      class="drawer-card"
                                    >
                                      <div class="drawer-row">
                                        <span class="drawer-label">{{ t("resource.details.bucket") }}</span>
                                        <span class="drawer-value">{{ endpoint.bucket || "—" }}</span>
                                      </div>
                                      <div class="drawer-row">
                                        <span class="drawer-label">{{ t("resource.details.endpoint") }}</span>
                                        <span class="drawer-value">{{ endpoint.endpoint || endpoint.url || "—" }}</span>
                                      </div>
                                      <div class="drawer-row">
                                        <span class="drawer-label">{{ t("resource.details.region") }}</span>
                                        <span class="drawer-value">{{ endpoint.region || "—" }}</span>
                                      </div>
                                      <div class="drawer-row">
                                        <span class="drawer-label">{{ t("resource.details.console") }}</span>
                                        <span class="drawer-value">
                                          <a v-if="resourcePopoverItem.url" :href="resourcePopoverItem.url" target="_blank" rel="noreferrer" class="resource-title-link" @click="rememberResourceVisit(space, resourcePopoverItem)">
                                            {{ t("resource.details.openConsole") }}
                                          </a>
                                        </span>
                                      </div>
                                      <div v-if="endpoint.bucket" class="drawer-actions">
                                        <button class="btn btn-ghost text-xs" @click="copyText(`s3://${endpoint.bucket}`)">{{ t("resource.details.copyS3") }}</button>
                                        <button class="btn btn-ghost text-xs" @click="copyText(`aws s3 ls s3://${endpoint.bucket}`)">{{ t("resource.details.copyCli") }}</button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div v-if="resourcePopoverItem.access_path" class="drawer-section">
                                  <div class="drawer-section-title">{{ t("resource.details.access") }}</div>
                                  <div class="drawer-section-body">
                                    <div class="drawer-row">
                                      <span class="drawer-label">{{ t("resource.details.accessPath") }}</span>
                                      <span class="drawer-value">{{ resourcePopoverItem.access_path }}</span>
                                    </div>
                                  </div>
                                </div>

                                <div class="drawer-section">
                                  <div class="drawer-section-title">{{ t("resource.details.actions") }}</div>
                                  <div class="drawer-section-body">
                                    <div v-if="normalizeActionKeys(resourcePopoverItem.action_keys).length" class="drawer-actions">
                                      <button
                                        v-for="actionKey in normalizeActionKeys(resourcePopoverItem.action_keys)"
                                        :key="`s3-action-${actionKey}`"
                                        class="btn btn-ghost text-xs"
                                        @click="invokeServiceAction(actionKey, resourcePopoverItem)"
                                      >
                                        {{ actionLabel(actionKey) || actionKey }}
                                      </button>
                                    </div>
                                    <div v-else class="text-xs text-white/50">{{ t("resource.details.noActions") }}</div>
                                  </div>
                                </div>
                              </div>

                              <div v-else class="resource-popover-body">
                                <div class="drawer-section">
                                  <div class="drawer-section-title">{{ t("resource.details.overview") }}</div>
                                  <div class="drawer-section-body">
                                    <div class="drawer-row">
                                      <span class="drawer-label">{{ t("resource.details.titleField") }}</span>
                                      <span class="drawer-value">{{ resourcePopoverItem.title }}</span>
                                    </div>
                                    <div v-if="resourcePopoverItem.description" class="drawer-row">
                                      <span class="drawer-label">{{ t("resource.details.description") }}</span>
                                      <span class="drawer-value">{{ resourcePopoverItem.description }}</span>
                                    </div>
                                    <div v-if="resourcePopoverItem.service_type" class="drawer-row">
                                      <span class="drawer-label">{{ t("resource.details.type") }}</span>
                                      <span class="drawer-value">{{ resourcePopoverItem.service_type }}</span>
                                    </div>
                                    <div v-if="resourcePopoverItem.tier" class="drawer-row">
                                      <span class="drawer-label">{{ t("resource.details.tier") }}</span>
                                      <span class="drawer-value">{{ resourcePopoverItem.tier }}</span>
                                    </div>
                                    <div v-if="resourcePopoverItem.lifecycle" class="drawer-row">
                                      <span class="drawer-label">{{ t("resource.details.lifecycle") }}</span>
                                      <span class="drawer-value">{{ resourcePopoverItem.lifecycle }}</span>
                                    </div>
                                    <div v-if="resourcePopoverItem.url" class="drawer-row">
                                      <span class="drawer-label">{{ t("resource.details.primaryLink") }}</span>
                                      <span class="drawer-value">
                                        <a :href="resourcePopoverItem.url" target="_blank" rel="noreferrer" class="resource-title-link" @click="rememberResourceVisit(space, resourcePopoverItem)">{{ t("surface.action.openResource") }}</a>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div
                                  class="drawer-section"
                                  v-if="resourcePopoverItem.owners && typeof resourcePopoverItem.owners === 'object' && Object.keys(resourcePopoverItem.owners).length"
                                >
                                  <div class="drawer-section-title">{{ t("resource.details.ownership") }}</div>
                                  <div class="drawer-section-body">
                                    <div class="drawer-row" v-for="(value, key) in resourcePopoverItem.owners" :key="`owner-${key}`">
                                      <span class="drawer-label">{{ key }}</span>
                                      <span class="drawer-value">{{ value }}</span>
                                    </div>
                                  </div>
                                </div>

                                <div class="drawer-section" v-if="normalizeLinks(resourcePopoverItem.links).length">
                                  <div class="drawer-section-title">{{ t("resource.details.links") }}</div>
                                  <div class="drawer-section-body">
                                    <div v-for="(link, idx) in normalizeLinks(resourcePopoverItem.links)" :key="`link-${idx}`" class="drawer-row">
                                      <span class="drawer-label">{{ link.label }}</span>
                                      <span class="drawer-value">
                                        <a :href="link.url" target="_blank" rel="noreferrer" class="resource-title-link">{{ t("surface.action.openResource") }}</a>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div class="drawer-section" v-if="Array.isArray(resourcePopoverItem.endpoints) && resourcePopoverItem.endpoints.length">
                                  <div class="drawer-section-title">{{ t("resource.details.endpoints") }}</div>
                                  <div class="drawer-section-body">
                                    <div
                                      v-for="(endpoint, idx) in resourcePopoverItem.endpoints"
                                      :key="`endpoint-${idx}`"
                                      class="drawer-row"
                                    >
                                      <span class="drawer-label">{{ endpoint.type || "endpoint" }}</span>
                                      <span class="drawer-value">{{ formatEndpointLine(endpoint) || "—" }}</span>
                                    </div>
                                  </div>
                                </div>

                                <div class="drawer-section" v-if="resourcePopoverItem.access_path">
                                  <div class="drawer-section-title">{{ t("resource.details.access") }}</div>
                                  <div class="drawer-section-body">
                                    <div class="drawer-row">
                                      <span class="drawer-label">{{ t("resource.details.accessPath") }}</span>
                                      <span class="drawer-value">{{ resourcePopoverItem.access_path }}</span>
                                    </div>
                                  </div>
                                </div>

                                <div class="drawer-section">
                                  <div class="drawer-section-title">{{ t("resource.details.actions") }}</div>
                                  <div class="drawer-section-body">
                                    <div v-if="normalizeActionKeys(resourcePopoverItem.action_keys).length" class="drawer-actions">
                                      <button
                                        v-for="actionKey in normalizeActionKeys(resourcePopoverItem.action_keys)"
                                        :key="`action-${actionKey}`"
                                        class="btn btn-ghost text-xs"
                                        @click="invokeServiceAction(actionKey, resourcePopoverItem)"
                                      >
                                        {{ actionLabel(actionKey) || actionKey }}
                                      </button>
                                    </div>
                                    <div v-else class="text-xs text-white/50">{{ t("resource.details.noActions") }}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div v-if="blockDataFor(space.id, block.id).length === 0" class="core-empty">{{ t("resource.noPinned") }}</div>
                      </div>
                      <div v-else-if="blockTypeIs(block, BLOCK_TYPES.text)" class="dashboard-text">
                        <div v-if="block.config?.text" class="text-white/80 whitespace-pre-wrap">
                          {{ block.config.text }}
                        </div>
                        <div v-else class="core-empty">{{ t("dashboard.empty.body") }}</div>
                      </div>
                      <div v-else class="core-empty">{{ t("dashboard.empty.body") }}</div>
                    </div>
                    <div v-if="isDashboardEditing(space)" class="dashboard-resize-handle"></div>
                  </div>
                  <div
                    v-if="isDashboardEditing(space) && dashboardEditSelectedId"
                    class="dashboard-block-editor"
                    :style="dashboardEditPanelStyle"
                  >
                    <div class="dashboard-editor-header">
                      <div class="text-xs uppercase tracking-widest text-white/50">{{ t("editor.blockSettings") }}</div>
                      <button class="btn btn-ghost btn-icon" @click="dashboardEditSelectedId = null">
                        <Tooltip
                          :content="t('app.close')"
                          :disabled="tooltipsDisabled"
                          :delay="tooltipDelay"
                        >
                          <X class="w-4 h-4" />
                        </Tooltip>
                      </button>
                    </div>
                    <div class="dashboard-sidebar-form">
                      <label class="dashboard-field">
                        <span>Title</span>
                        <input v-model="dashboardEditForm.title" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                      </label>
                      <label class="dashboard-field">
                        <span>Type</span>
                        <select v-model="dashboardEditForm.type" class="select text-xs" @change="applyDashboardEditForm(space.id)">
                          <option v-for="opt in BLOCK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                          </option>
                        </select>
                      </label>
                      <button class="btn btn-ghost text-xs self-start" @click="dashboardEditAdvanced = !dashboardEditAdvanced">
                        {{ dashboardEditAdvanced ? t("editor.hideAdvanced") : t("editor.showAdvanced") }}
                      </button>
                      <p class="text-[11px] text-white/45 leading-5">
                        {{ t("editor.advancedHint") }}
                      </p>
                      <div class="grid grid-cols-4 gap-2" v-if="dashboardEditAdvanced">
                        <label class="dashboard-field">
                          <span>X</span>
                          <input v-model.number="dashboardEditForm.x" type="number" min="1" max="12" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                        </label>
                        <label class="dashboard-field">
                          <span>Y</span>
                          <input v-model.number="dashboardEditForm.y" type="number" min="1" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                        </label>
                        <label class="dashboard-field">
                          <span>W</span>
                          <input v-model.number="dashboardEditForm.w" type="number" min="1" max="12" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                        </label>
                        <label class="dashboard-field">
                          <span>H</span>
                          <input v-model.number="dashboardEditForm.h" type="number" min="1" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                        </label>
                      </div>
                      <div class="grid grid-cols-3 gap-2">
                        <label class="dashboard-field">
                          <span>Order</span>
                          <input v-model.number="dashboardEditForm.order" type="number" min="1" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                        </label>
                        <label class="dashboard-field">
                          <span>Limit</span>
                          <input v-model.number="dashboardEditForm.limit" type="number" min="1" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                        </label>
                        <label class="dashboard-field">
                          <span>Scope</span>
                          <input v-model="dashboardEditForm.scope" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                        </label>
                      </div>
                      <label class="dashboard-field" v-if="dashboardEditAdvanced">
                        <span>Filter</span>
                        <input v-model="dashboardEditForm.filter" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                      </label>
                      <label v-if="dashboardEditForm.type === BLOCK_TYPES.text" class="dashboard-field">
                        <span>Text</span>
                        <textarea v-model="dashboardEditForm.text" rows="4" class="input text-xs" @input="applyDashboardEditForm(space.id)"></textarea>
                      </label>
                      <button class="btn btn-danger" @click="deleteDashboardBlockDraft(space, dashboardEditSelectedId)">
                        Delete block
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="me && globalWidgets.length && sidx === 0" class="col-span-full grid gap-3 sm:grid-cols-2 lg:grid-cols-4 note-hero">
            <div
              v-for="widget in globalWidgets"
              :key="widget.id"
              class="card-glass card-note col-span-full sm:col-span-1 lg:col-span-2"
            >
              <div class="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div class="text-base font-semibold text-white/90">
                    📢 {{ widget.title || "Объявления" }}
                  </div>
                </div>
                <Pin class="w-5 h-5 note-pin" />
              </div>
              <div v-if="widget.type === 'markdown'" class="note-body" v-html="widgetHtml(widget.content)"></div>
              <div v-else-if="widget.type === 'clock'" class="clock-widget" :class="clockThemeClass(widget, space)">
                <div class="clock-time">{{ clockTimeFor(widget) }}</div>
                <div class="clock-date">{{ clockDateFor() }}</div>
              </div>
              <div v-else-if="widget.type === 'calendar'" class="widget-calendar" :class="{ 'calendar-compact': calendarVariant(widget, space) === 'compact' }">
                <div class="calendar-date">{{ calendarDateLabel(widget) }}</div>
                <div class="calendar-events">
                  <div
                    v-for="(event, idx) in calendarEventsFor(widget, space)"
                    :key="`${widget.id}-event-${idx}`"
                    class="calendar-event"
                  >
                    <span class="event-dot" :class="eventStatusClass(event)"></span>
                    <span class="event-time">{{ event.time }}</span>
                    <span class="event-title">{{ event.title }}</span>
                  </div>
                  <div v-if="calendarEventsFor(widget, space).length === 0" class="calendar-empty">
                    No events
                  </div>
                </div>
              </div>
              <div v-else-if="widget.type === 'todo'" class="widget-todo">
                <div class="todo-list">
                  <button
                    v-for="(todo, idx) in todoItemsFor(widget)"
                    :key="`${widget.id}-todo-${idx}`"
                    type="button"
                    class="todo-item"
                    :class="{ done: todo.done }"
                    @click="toggleTodo(widget.id, idx)"
                  >
                    <span class="todo-check">{{ todo.done ? '✓' : '' }}</span>
                    <span class="todo-text">{{ todo.text }}</span>
                  </button>
                  <div v-if="todoItemsFor(widget).length === 0" class="todo-empty">
                    Nothing to do
                  </div>
                </div>
              </div>
              <div v-else-if="widget.type === 'booking'" class="widget-booking">
                <div class="booking-header">
                  <div class="booking-resource">{{ widget.booking?.resource || "Resource" }}</div>
                  <div class="booking-status" :class="bookingStatusClass(widget.booking)">
                    {{ bookingStatusLabel(widget.booking) }}
                  </div>
                </div>
                <div class="booking-bar">
                  <div class="booking-bar-fill" :style="{ width: `${widget.booking?.busy_percent || 0}%` }"></div>
                </div>
                <div v-if="widget.booking?.cta" class="booking-cta">{{ widget.booking.cta }}</div>
              </div>
              <div v-else-if="widget.type === 'timeline'" class="widget-timeline">
                <div class="timeline-list">
                  <div
                    v-for="notif in businessNotifications.slice(0, widget.limit || 5)"
                    :key="notif.id"
                    class="timeline-item"
                  >
                    <span class="timeline-icon">{{ notif.icon || '📢' }}</span>
                    <span class="timeline-time">{{ formatNotifTime(notif.created_at) }}</span>
                    <span class="timeline-text">{{ notif.title }}</span>
                  </div>
                  <div v-if="businessNotifications.length === 0" class="timeline-empty">
                    No recent events
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-for="widget in localWidgets(space)"
            v-if="me"
            :key="widget.id"
            class="card-glass card-note col-span-full sm:col-span-1 lg:col-span-2"
            :class="{
              'card-note-tech': widget.id?.includes('admin'),
              'card-note-kids': isKidsSpace(space)
            }"
          >
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <div class="text-base font-semibold text-white/90">
                  <span :class="{ 'note-title-tech': widget.id?.includes('admin') }">
                    {{ widget.title || "Объявления" }}
                  </span>
                </div>
              </div>
              <Pin class="w-5 h-5 text-white/60" />
            </div>
            <div v-if="widget.type === 'markdown'" class="note-body" v-html="widgetHtml(widget.content)"></div>
            <div v-else-if="widget.type === 'clock'" class="clock-widget" :class="clockThemeClass(widget, space)">
              <div class="clock-time">{{ clockTimeFor(widget) }}</div>
              <div class="clock-date">{{ clockDateFor() }}</div>
            </div>
            <div v-else-if="widget.type === 'calendar'" class="widget-calendar" :class="{ 'calendar-compact': calendarVariant(widget, space) === 'compact' }">
              <div class="calendar-date">{{ calendarDateLabel(widget) }}</div>
              <div class="calendar-events">
                <div
                  v-for="(event, idx) in calendarEventsFor(widget, space)"
                  :key="`${widget.id}-event-${idx}`"
                  class="calendar-event"
                >
                  <span class="event-dot" :class="eventStatusClass(event)"></span>
                  <span class="event-time">{{ event.time }}</span>
                  <span class="event-title">{{ event.title }}</span>
                </div>
                <div v-if="calendarEventsFor(widget, space).length === 0" class="calendar-empty">
                  No events
                </div>
              </div>
            </div>
            <div v-else-if="widget.type === 'todo'" class="widget-todo">
              <div class="todo-list">
                <button
                  v-for="(todo, idx) in todoItemsFor(widget)"
                  :key="`${widget.id}-todo-${idx}`"
                  type="button"
                  class="todo-item"
                  :class="{ done: todo.done }"
                  @click="toggleTodo(widget.id, idx)"
                >
                  <span class="todo-check">{{ todo.done ? '✓' : '' }}</span>
                  <span class="todo-text">{{ todo.text }}</span>
                </button>
                <div v-if="todoItemsFor(widget).length === 0" class="todo-empty">
                  Nothing to do
                </div>
              </div>
            </div>
            <div v-else-if="widget.type === 'booking'" class="widget-booking">
              <div class="booking-header">
                <div class="booking-resource">{{ widget.booking?.resource || "Resource" }}</div>
                <div class="booking-status" :class="bookingStatusClass(widget.booking)">
                  {{ bookingStatusLabel(widget.booking) }}
                </div>
              </div>
              <div class="booking-bar">
                <div class="booking-bar-fill" :style="{ width: `${widget.booking?.busy_percent || 0}%` }"></div>
              </div>
              <div v-if="widget.booking?.cta" class="booking-cta">{{ widget.booking.cta }}</div>
            </div>
            <div v-else-if="widget.type === 'timeline'" class="widget-timeline">
              <div class="timeline-list">
                <div
                  v-for="notif in businessNotifications.slice(0, widget.limit || 5)"
                  :key="notif.id"
                  class="timeline-item"
                >
                  <span class="timeline-icon">{{ notif.icon || '📢' }}</span>
                  <span class="timeline-time">{{ formatNotifTime(notif.created_at) }}</span>
                  <span class="timeline-text">{{ notif.title }}</span>
                </div>
                <div v-if="businessNotifications.length === 0" class="timeline-empty">
                  No recent events
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="dashboardAddOpen" class="modal-backdrop" @click.self="closeAddBlockPicker">
      <div class="modal-content block-picker-modal">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">{{ t("editor.addBlockTitle") }}</h3>
          <button class="btn btn-ghost btn-icon" @click="closeAddBlockPicker">
            <Tooltip
              :content="t('app.close')"
              :disabled="tooltipsDisabled"
              :delay="tooltipDelay"
            >
              <X class="w-4 h-4" />
            </Tooltip>
          </button>
        </div>
        <div class="text-sm text-white/50 mb-4">
          {{ t("editor.addBlockBody") }}
        </div>
        <div class="block-picker-grid">
          <button
            v-for="option in BLOCK_TYPE_CARDS"
            :key="option.value"
            class="block-picker-card"
            @click="addBlockFromPicker(currentSpace, option.value)"
          >
            <div class="block-picker-icon">
              <component :is="option.icon" class="w-5 h-5" />
            </div>
            <div class="block-picker-info">
              <div class="block-picker-title">{{ option.label }}</div>
              <div class="block-picker-desc">{{ option.description }}</div>
            </div>
          </button>
        </div>
      </div>
    </div>


    <div v-if="showShortcuts" class="modal-backdrop" @click.self="showShortcuts = false">
      <div class="modal-content admin-modal">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">{{ t("app.keyboardShortcuts") }}</h3>
          <button class="btn btn-ghost btn-icon" @click="showShortcuts = false">
            <Tooltip
              :content="t('app.close')"
              :disabled="tooltipsDisabled"
              :delay="tooltipDelay"
            >
              <X class="w-4 h-4" />
            </Tooltip>
          </button>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="card-glass">
            <div class="text-sm font-semibold">{{ t("app.shortcutsNavigateTitle") }}</div>
            <div class="text-white/50 text-xs mt-1">{{ t("app.shortcutsNavigateBody") }}</div>
            <div class="mt-3 flex gap-2 flex-wrap">
              <span class="chip">{{ HOTKEYS.prev }}</span>
              <span class="chip">{{ HOTKEYS.next }}</span>
            </div>
          </div>
          <div class="card-glass">
            <div class="text-sm font-semibold">{{ t("app.shortcutsHelpTitle") }}</div>
            <div class="text-white/50 text-xs mt-1">{{ t("app.shortcutsHelpBody") }}</div>
            <div class="mt-3">
              <span class="chip">{{ HOTKEYS.help }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>


    <div v-if="ENABLE_V0_EDITOR && showDashboardEditor && dashboardEditorSpace" class="modal-backdrop" @click.self="showDashboardEditor = false">
      <div class="modal-content dashboard-editor-modal">
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="text-lg font-semibold">{{ t("admin.dashboard.editor") }}</div>
            <div class="text-xs text-white/40">{{ dashboardEditorSpace.title }}</div>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-[11px] text-white/40 uppercase tracking-wider">{{ t("admin.dashboard.preview") }}</label>
            <select v-model="dashboardPreviewRole" class="select text-xs" @change="onPreviewRoleChange">
              <option value="guest">guest</option>
              <option value="user">user</option>
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
            <button class="btn btn-ghost" @click="showDashboardEditor = false">{{ t("app.close") }}</button>
          </div>
        </div>
        <div class="dashboard-editor">
          <div class="dashboard-editor-preview">
            <div class="dashboard-grid">
              <div
                v-for="block in dashboardEditorBlocks"
                :key="block.id"
                class="dashboard-block card-glass"
                :style="blockStyle(block, blockOrderMapFromBlocks(dashboardEditorBlocks))"
              >
                <div class="dashboard-block-header">
                <div class="dashboard-block-title">{{ blockTitle(block) }}</div>
                <span class="chip chip-muted">{{ blockTypeLabel(block) }}</span>
                </div>
              </div>
            </div>
            <div class="mt-3 text-[11px] text-white/40 space-y-1">
              <div v-for="block in dashboardEditorBlocks" :key="`preview-${block.id}`">
                {{ blockTitle(block) }} · {{ blockDataCount(dashboardEditorSpace.id, block.id) }} items
              </div>
            </div>
          </div>
          <div class="dashboard-editor-controls">
            <div class="flex items-center justify-between mb-3">
              <div class="text-sm font-semibold">{{ t("admin.dashboard.blocks") }}</div>
              <button class="btn btn-ghost text-xs" @click="addDashboardBlock">
                {{ t("app.addBlock") }}
              </button>
            </div>
            <div class="space-y-3">
              <div v-for="block in dashboardEditorBlocks" :key="block.id" class="card-glass dashboard-editor-block">
                <div class="flex items-center justify-between gap-2 mb-3">
                  <input v-model="block.title" class="input text-xs" placeholder="Block title" />
                  <select v-model="block.type" class="select text-xs">
                    <option v-for="opt in BLOCK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div class="grid grid-cols-4 gap-2 text-xs">
                  <label class="text-white/50">x
                    <input v-model.number="block.layout.lg.x" type="number" min="1" max="12" class="input text-xs mt-1" />
                  </label>
                  <label class="text-white/50">y
                    <input v-model.number="block.layout.lg.y" type="number" min="1" class="input text-xs mt-1" />
                  </label>
                  <label class="text-white/50">w
                    <input v-model.number="block.layout.lg.w" type="number" min="1" max="12" class="input text-xs mt-1" />
                  </label>
                  <label class="text-white/50">h
                    <input v-model.number="block.layout.lg.h" type="number" min="1" class="input text-xs mt-1" />
                  </label>
                </div>
                <div class="grid grid-cols-3 gap-2 text-xs mt-2">
                  <label class="text-white/50">order
                    <input v-model.number="block.layout.xs.order" type="number" min="1" class="input text-xs mt-1" />
                  </label>
                  <label class="text-white/50">limit
                    <input v-model.number="block.config.limit" type="number" min="1" class="input text-xs mt-1" />
                  </label>
                  <label class="text-white/50">scope
                    <input v-model="block.config.scope" type="text" class="input text-xs mt-1" />
                  </label>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-4">
              <button class="btn btn-primary flex-1" :disabled="dashboardEditorSaving" @click="saveDashboardEditor">
                {{ dashboardEditorSaving ? `${t("app.save")}...` : t("app.saveDashboard") }}
              </button>
              <button class="btn btn-ghost" @click="showDashboardEditor = false">{{ t("app.cancel") }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Inline Block Settings Popover -->
    <div v-if="ENABLE_V0_RESOURCE_DETAILS && serviceDetailsOpen && serviceDetailsItem" class="modal-backdrop" @click.self="closeServiceDetails">
      <div class="modal-content admin-modal">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">{{ t("resource.details.title") }}</h3>
          <button class="btn btn-ghost btn-icon" @click="closeServiceDetails">
            <Tooltip
              :content="t('app.close')"
              :disabled="tooltipsDisabled"
              :delay="tooltipDelay"
            >
              <X class="w-4 h-4" />
            </Tooltip>
          </button>
        </div>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.serviceType") }}</label>
              <input v-model="serviceDetailsItem.serviceType" class="input text-xs" :placeholder="t('admin.common.placeholder.serviceType')" />
            </div>
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.tier") }}</label>
              <input v-model="serviceDetailsItem.tier" class="input text-xs" :placeholder="t('admin.common.placeholder.tier')" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.lifecycle") }}</label>
              <input v-model="serviceDetailsItem.lifecycle" class="input text-xs" :placeholder="t('admin.common.placeholder.lifecycle')" />
            </div>
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.classification") }}</label>
              <input v-model="serviceDetailsItem.classification" class="input text-xs" :placeholder="t('admin.common.placeholder.classification')" />
            </div>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.runbookUrl") }}</label>
            <input v-model="serviceDetailsItem.runbookUrl" class="input text-xs" :placeholder="t('admin.common.placeholder.runbookUrl')" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.accessPath") }}</label>
            <input v-model="serviceDetailsItem.accessPath" class="input text-xs" :placeholder="t('admin.common.placeholder.accessPath')" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.dependsOn") }}</label>
            <input v-model="serviceDetailsItem.dependsOnInput" class="input text-xs" :placeholder="t('admin.common.placeholder.dependsOn')" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.ownersJson") }}</label>
            <textarea v-model="serviceDetailsItem.ownersInput" class="input text-xs" rows="4" :placeholder="t('admin.common.placeholder.ownersJson')"></textarea>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.linksJson") }}</label>
            <textarea v-model="serviceDetailsItem.linksInput" class="input text-xs" rows="4" :placeholder="t('admin.common.placeholder.linksJson')"></textarea>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.endpointsJson") }}</label>
            <textarea v-model="serviceDetailsItem.endpointsInput" class="input text-xs" rows="4" :placeholder="t('admin.common.placeholder.endpointsJson')"></textarea>
          </div>
          <div class="flex items-center gap-2 pt-2">
            <button class="btn btn-primary flex-1" @click="updateDirectoryItem(serviceDetailsItem)">{{ t("app.save") }}</button>
            <button class="btn btn-ghost" @click="closeServiceDetails">{{ t("app.close") }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="serviceEditItem" class="modal-backdrop" @click.self="closeServiceEdit">
      <div class="modal-content admin-modal">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">{{ t("admin.services.editTitle") }}</h3>
          <button class="btn btn-ghost btn-icon" @click="closeServiceEdit">
            <Tooltip
              :content="t('app.close')"
              :disabled="tooltipsDisabled"
              :delay="tooltipDelay"
            >
              <X class="w-4 h-4" />
            </Tooltip>
          </button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.key") }}</label>
            <input v-model="serviceEditItem.key" class="input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.title") }}</label>
            <input v-model="serviceEditItem.title" class="input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.description") }}</label>
            <input v-model="serviceEditItem.description" class="input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.iconUrl") }}</label>
            <input
              v-model="serviceEditItem.iconUrl"
              class="input text-xs"
              :placeholder="t('admin.common.placeholder.iconUrl')"
              @blur="serviceEditItem.iconUrl = normalizeIconUrl(serviceEditItem.iconUrl)"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.serviceType") }}</label>
              <input v-model="serviceEditItem.serviceType" class="input text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.tier") }}</label>
              <input v-model="serviceEditItem.tier" class="input text-xs" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.lifecycle") }}</label>
              <input v-model="serviceEditItem.lifecycle" class="input text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.classification") }}</label>
              <input v-model="serviceEditItem.classification" class="input text-xs" />
            </div>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.tags") }}</label>
            <input v-model="serviceEditItem.tagsInput" class="input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.dependsOn") }}</label>
            <input v-model="serviceEditItem.dependsOnInput" class="input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.ownersJson") }}</label>
            <textarea v-model="serviceEditItem.ownersInput" class="input text-xs" rows="3"></textarea>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.linksJson") }}</label>
            <textarea v-model="serviceEditItem.linksInput" class="input text-xs" rows="3"></textarea>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.endpointsJson") }}</label>
            <textarea v-model="serviceEditItem.endpointsInput" class="input text-xs" rows="3"></textarea>
          </div>
          <div class="flex items-center gap-2 pt-2">
            <button class="btn btn-primary flex-1" @click="updateService(serviceEditItem)">{{ t("app.save") }}</button>
            <button class="btn btn-ghost" @click="closeServiceEdit">{{ t("app.cancel") }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="inlineEditPopover === 'settings' && inlineEditBlock" class="modal-backdrop" @click.self="closeInlineEdit">
      <div class="inline-popover">
        <div class="inline-popover-header">
          <h3 class="text-lg font-semibold">{{ t("editor.blockSettings") }}</h3>
          <button class="btn btn-ghost btn-icon" @click="closeInlineEdit">
            <Tooltip
              :content="t('app.close')"
              :disabled="tooltipsDisabled"
              :delay="tooltipDelay"
            >
              <X class="w-4 h-4" />
            </Tooltip>
          </button>
        </div>
        <div class="space-y-4 mt-4">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Title</label>
            <input v-model="inlineEditForm.title" class="input" placeholder="Block title" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Type</label>
            <select v-model="inlineEditForm.type" class="select w-full">
              <option v-for="opt in BLOCK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <button class="btn btn-ghost text-xs self-start" @click="inlineEditAdvanced = !inlineEditAdvanced">
            {{ inlineEditAdvanced ? t("editor.hideAdvanced") : t("editor.showAdvanced") }}
          </button>
          <p class="text-[11px] text-white/45 leading-5">
            {{ t("editor.advancedHint") }}
          </p>
          <div v-if="inlineEditAdvanced" class="grid grid-cols-4 gap-2">
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">X</label>
              <input v-model.number="inlineEditForm.x" type="number" min="1" max="12" class="input text-center" />
            </div>
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Y</label>
              <input v-model.number="inlineEditForm.y" type="number" min="1" class="input text-center" />
            </div>
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">W</label>
              <input v-model.number="inlineEditForm.w" type="number" min="1" max="12" class="input text-center" />
            </div>
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">H</label>
              <input v-model.number="inlineEditForm.h" type="number" min="1" class="input text-center" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Order</label>
              <input v-model.number="inlineEditForm.order" type="number" min="1" class="input text-center" />
            </div>
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Limit</label>
              <input v-model.number="inlineEditForm.limit" type="number" min="1" class="input text-center" />
            </div>
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Scope</label>
              <input v-model="inlineEditForm.scope" type="text" class="input text-center" />
            </div>
          </div>
          <div v-if="inlineEditAdvanced">
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Filter</label>
            <input v-model="inlineEditForm.filter" type="text" class="input" />
          </div>
          <div v-if="inlineEditForm.type === BLOCK_TYPES.text">
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Text</label>
            <textarea v-model="inlineEditForm.text" class="input" rows="4" placeholder="Text content"></textarea>
          </div>
          <div class="flex items-center gap-2 pt-2">
            <button class="btn btn-primary flex-1" @click="saveBlockSettings">Save</button>
            <button class="btn btn-ghost" @click="closeInlineEdit">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Inline Add Content Popover -->
    <div v-if="inlineEditPopover === 'add' && inlineEditBlock" class="modal-backdrop" @click.self="closeInlineEdit">
      <div class="inline-popover">
        <div class="inline-popover-header">
          <h3 class="text-lg font-semibold">
            Add Resource
          </h3>
          <button class="btn btn-ghost btn-icon" @click="closeInlineEdit">
            <Tooltip
              :content="t('app.close')"
              :disabled="tooltipsDisabled"
              :delay="tooltipDelay"
            >
              <X class="w-4 h-4" />
            </Tooltip>
          </button>
        </div>
        <div class="space-y-4 mt-4">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Title</label>
            <input v-model="inlineAddForm.title" class="input" placeholder="Title" />
          </div>
          
          <template v-if="isResourcesBlock(inlineEditBlock.block)">
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">URL</label>
              <input v-model="inlineAddForm.url" class="input" placeholder="https://..." />
            </div>
          </template>
          
          <div class="flex items-center gap-2 pt-2">
            <button class="btn btn-primary flex-1" @click="saveInlineContent">
              Create Resource
            </button>
            <button class="btn btn-ghost" @click="closeInlineEdit">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
