# Feature Specification: Authentication & Authorization (RBAC)

**Feature Branch**: `002-auth-rbac`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "Define the complete Authentication and Authorization module for Hakeem. Three roles: Patient, Doctor, Administrator. Patients can register, login, logout, forgot/reset password, verify email, change password. Doctors cannot self-register; doctor accounts are created and approved by Administrators. Administrators manage users, doctors, permissions, and account activation. Goals: secure authn/authz, protect healthcare data, trusted sessions, prevent unauthorized access, future OAuth and MFA readiness. Every authenticated request must validate identity and permissions. Authorization always enforced server-side. Healthcare security best practices. UI already designed and approved in Stitch — do not redesign; Stitch is the single source of truth for UI."

## Clarifications

### Session 2026-07-29

Non-interactive clarification pass: user directed no questions; enterprise-grade assumptions applied for session lifetime, Remember Me, password policy/hashing, email verification, password reset, refresh tokens, session storage model, concurrent sessions, device management, lockout, rate limiting, audit logging, secure cookies, CSRF, role model, doctor approval, admin provisioning, future OAuth, and future MFA. All decisions recorded below and reflected in Requirements, Assumptions, and Success Criteria.

- Q: Session lifetime? → A: Idle timeout 30 minutes (Patient/Doctor) and 15 minutes (Administrator); absolute maximum 12 hours without Remember Me; activity within idle window extends the idle clock; absolute expiry always enforced.
- Q: Remember Me? → A: Optional on login when Stitch UI includes it (or equivalent long-session control); when enabled, issues a rotating refresh credential and extends absolute lifetime to 30 days with sliding refresh; when disabled, no long-lived refresh—session ends at idle or 12-hour absolute max.
- Q: Password policy? → A: Minimum 12 characters; at least one uppercase, one lowercase, one digit, and one special character; must not equal email or email local-part; reject common/breached passwords when a check service/list is available; cannot reuse any of the last 5 passwords.
- Q: Password hashing? → A: Store only one-way adaptive hashes (Argon2id preferred; bcrypt acceptable equivalent); unique salt/pepper strategy per platform standard; never reversible encryption or plaintext.
- Q: Email verification? → A: Required for Patients before full privileges; single-use challenge; TTL 24 hours; resend rate-limited (min 60s between sends; max 5/hour/account); success marks email verified; unverified patients may only access public content.
- Q: Password reset? → A: Single-use challenge; TTL 1 hour; always show anti-enumeration success on request; on successful reset invalidate all sessions and all refresh credentials for that account; resend limits match verification.
- Q: Refresh tokens? → A: Yes for Remember Me / long sessions: opaque refresh credentials stored server-side (hash-at-rest), rotated on use, reuse detection revokes the token family; short-lived session proof remains the day-to-day auth artifact.
- Q: JWT vs database sessions? → A: Database-backed (server-side) sessions are the source of truth for v1 so revocation is immediate; browser holds an opaque session identifier (not a self-contained privileged JWT as the sole trust). Stateless JWT-only auth is rejected for v1 healthcare access control.
- Q: Concurrent sessions? → A: Allowed up to 5 concurrent sessions per account; creating a 6th ends the least-recently-used session; admin/user can revoke any or all.
- Q: Device management? → A: Each session records a device/client label, approximate network origin, created time, and last activity; users can list sessions and revoke one or all others; admins can force-revoke all sessions for any user.
- Q: Account lockout? → A: After 5 consecutive failed password attempts on an account, lock login for 15 minutes; administrators may unlock earlier; successful login clears the failure counter.
- Q: Login rate limiting? → A: In addition to per-account lockout, limit login attempts per network origin to 20 per 15 minutes; limit password-reset and verification emails per account as above; apply generic throttling to auth endpoints to reduce credential stuffing.
- Q: Audit logging? → A: Append-only security audit events for authn/authz lifecycle (login success/fail, logout, lockout, unlock, password change/reset, email verify, refresh reuse, session revoke, role change, activation/deactivation, doctor approve/reject, admin create); retain ≥ 365 days; include actor, action, target, outcome, timestamp, and request metadata (origin/user-agent) where available.
- Q: Secure cookies? → A: Session and refresh cookies MUST be HttpOnly, Secure, and SameSite=Lax (SameSite=Strict for administrator console cookies when compatible with approved flows); scoped to the auth host path; not readable by client scripts.
- Q: CSRF protection? → A: Required for all cookie-authenticated state-changing requests (login session establishment flows included where applicable); defense via SameSite cookies plus server-validated anti-CSRF mechanism for mutating requests.
- Q: Role hierarchy? → A: Flat RBAC with exactly one primary role per user in v1; roles do not inherit (Administrator does not automatically receive Doctor or Patient clinical permissions); permissions are explicit per role.
- Q: Doctor approval workflow? → A: States Created → Pending Approval → Active → Suspended/Deactivated (and Rejected from Pending); create does not grant login; explicit Administrator Approve required; on approve send invite to set password; Reject records reason and blocks login; Suspend/Deactivate ends sessions immediately.
- Q: Administrator account provisioning? → A: No public admin registration; first admin via controlled operational bootstrap; additional admins only created/invited by an existing Administrator; email verification required before admin full access; system prevents removal/deactivation of the last active Administrator.
- Q: Future OAuth? → A: v1 ships email/password only; account model reserves external-identity linking (provider, subject, linked-at) with verified-email match before link; linking never changes role; OAuth does not bypass doctor approval or admin provisioning rules.
- Q: Future MFA? → A: v1 has no MFA challenge; auth pipeline reserves a post-password / pre-session step; when enabled later, Administrators and Doctors are first mandatory cohorts; Patients optional initially; TOTP (authenticator app) is the first planned method.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Patient registers and verifies email (Priority: P1)

A new patient creates an account with valid credentials, receives an email verification challenge, and completes verification so the account becomes trusted for protected patient actions.

**Why this priority**: Patient self-registration is the primary onboarding path and the foundation for trusted identity in a healthcare platform.

**Independent Test**: Complete registration as a new patient, confirm verification messaging, complete email verification with a valid token/link within 24 hours, and confirm the account is active and can sign in; attempt protected actions before verification and confirm they are blocked; confirm expired/reused challenges fail and resend limits apply.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on the approved registration screen, **When** they submit valid registration details (including email and password meeting policy), **Then** an account is created in a pending-verification state and they receive clear confirmation that email verification is required.
2. **Given** a newly registered patient, **When** they open a valid verification link or enter a valid verification code within 24 hours, **Then** their email is marked verified and they can proceed to sign in (or are signed in if the design flow completes session creation).
3. **Given** a patient with an unverified email, **When** they attempt actions that require a verified account, **Then** the system denies those actions and prompts them to complete verification.
4. **Given** an expired or already-used verification link/code, **When** the patient attempts verification, **Then** they see a clear failure message and a path to request a new verification email.
5. **Given** registration with an email that already belongs to an existing account, **When** the form is submitted, **Then** the system does not create a duplicate account and shows a safe anti-enumeration message with guidance toward sign-in or password reset.
6. **Given** a patient requesting another verification email, **When** requests are repeated faster than allowed, **Then** the system rate-limits sends (minimum 60 seconds between sends; maximum 5 per hour) and informs the user to wait.

---

### User Story 2 - Patient signs in and maintains a trusted session (Priority: P1)

A verified patient signs in with email and password, optionally chooses Remember Me, receives a server-validated trusted session, and can access only patient-permitted areas until they sign out or the session ends.

**Why this priority**: Login and session trust are required for every protected patient journey and for proving identity on each authenticated request.

**Independent Test**: Sign in as a verified patient with and without Remember Me; confirm idle and absolute timeouts; confirm access to patient-allowed areas only; confirm server-side session validation; sign out and confirm the session identifier cannot be reused.

**Acceptance Scenarios**:

1. **Given** a verified patient with a valid password, **When** they submit correct credentials on the approved login screen without Remember Me, **Then** a server-side session is established (opaque session cookie), idle timeout is 30 minutes, absolute maximum is 12 hours, and they are directed to the patient post-login destination.
2. **Given** a verified patient enabling Remember Me at login, **When** authentication succeeds, **Then** a rotating refresh credential is issued, absolute lifetime may extend up to 30 days via refresh, and cookies follow secure cookie rules.
3. **Given** an authenticated patient, **When** any protected request is made, **Then** the system validates the session server-side and role/permissions before fulfilling the request.
4. **Given** an authenticated patient, **When** they attempt to open doctor-only or administrator-only areas, **Then** access is denied without exposing sensitive data and a security audit event is recorded for the denial of privileged access.
5. **Given** an authenticated patient, **When** they choose Logout, **Then** the current session and its refresh credential (if any) are invalidated and subsequent protected requests require sign-in again.
6. **Given** wrong credentials or a deactivated/locked account, **When** login is attempted, **Then** access is denied with a clear, safe error message and no privileged information is disclosed.

---

### User Story 3 - Patient recovers and changes password (Priority: P1)

A patient who forgot their password can request a reset, complete reset via a time-limited secure challenge, and later change password while authenticated. Password reset invalidates all sessions; password change invalidates all other sessions.

**Why this priority**: Account recovery and password hygiene are essential for continuous access and for reducing account-takeover risk in healthcare contexts.

**Independent Test**: Complete forgot-password → reset within 1 hour; confirm all sessions end; change password while signed in; confirm other sessions end; confirm expired/reused challenges fail; confirm new password meets policy and is not in last-5 history.

**Acceptance Scenarios**:

1. **Given** a patient on Forgot Password, **When** they submit any email address, **Then** the system always shows a generic success message and, only if the email belongs to an eligible account, sends a single-use reset challenge valid for 1 hour.
2. **Given** a valid, unexpired reset challenge, **When** the patient sets a new password meeting policy, **Then** the password hash is updated, the challenge is consumed, all sessions and refresh credentials for that account are invalidated, and they can sign in with the new password.
3. **Given** an authenticated patient on Change Password, **When** they provide the current password and a valid new password (not in last 5), **Then** the password is updated, all other sessions are invalidated, and the current session may continue or be re-established securely.
4. **Given** an expired, reused, or forged reset challenge, **When** reset is attempted, **Then** the change is rejected and the user is guided to request a new reset.
5. **Given** password hashing at rest, **When** credentials are stored or verified, **Then** only adaptive one-way hashes are used (never plaintext or reversible encryption).

---

### User Story 4 - Administrator creates and approves doctor accounts (Priority: P1)

An administrator creates a doctor account (doctors cannot self-register), moves it through explicit approval, and only then can the doctor set a password via invite and sign in. The administrator can reject, suspend, or deactivate accounts.

**Why this priority**: Doctor identity is high-trust clinical access; controlled provisioning is a core authorization and compliance control.

**Independent Test**: Create doctor (Pending Approval) and confirm login fails; Approve and confirm invite/set-password works; Reject and confirm login remains blocked; Suspend/Deactivate and confirm sessions end; confirm no public doctor registration.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator, **When** they create a doctor user with required identity details, **Then** the account is Created/Pending Approval and cannot establish a trusted session.
2. **Given** a doctor account Pending Approval, **When** that doctor attempts login, **Then** access is denied with a clear message that the account is not active.
3. **Given** an administrator approving a doctor, **When** approval succeeds, **Then** the account becomes Active, an invite is sent to set a password, and after password setup the doctor can sign in to doctor-permitted areas only.
4. **Given** an administrator rejecting a pending doctor, **When** rejection is recorded with a reason, **Then** the account cannot sign in and approval would be required again (or a new provisioning) before access.
5. **Given** any visitor or patient, **When** they look for doctor self-registration, **Then** no public doctor self-registration path exists.
6. **Given** an administrator suspending or deactivating a doctor, **When** the action succeeds, **Then** all sessions and refresh credentials for that account are revoked immediately (effective on next request within the revocation SLA).

---

### User Story 5 - Doctor signs in under RBAC constraints (Priority: P2)

An approved, active doctor signs in, maintains a trusted session, can change password and log out, manage their own sessions/devices, and is blocked from administrator capabilities and from patient-only capabilities not granted to Doctor.

**Why this priority**: Doctors are a primary clinical actor; their auth path must work once provisioning exists, but depends on admin approval (P1).

**Independent Test**: Sign in as an activated doctor; verify doctor-permitted access only (flat RBAC, no inherited admin rights); logout, password change, and session revoke work.

**Acceptance Scenarios**:

1. **Given** an activated doctor with valid credentials, **When** they sign in, **Then** a server-side trusted session is established and they land in the doctor post-login destination.
2. **Given** an authenticated doctor, **When** protected requests are made, **Then** identity and Doctor-role permissions are validated server-side on every request.
3. **Given** an authenticated doctor, **When** they attempt administrator-only user/permission management, **Then** access is denied (Doctor does not inherit Administrator permissions).
4. **Given** an authenticated doctor, **When** they change password or log out, **Then** the same security behaviors as patient password change/logout apply.

---

### User Story 6 - Administrator manages users, permissions, and activation (Priority: P2)

An administrator lists and manages users (patients and doctors), assigns exactly one primary role per user, activates/deactivates/suspends accounts, provisions additional administrators by invite, and reviews account status for access governance.

**Why this priority**: Ongoing access governance is required after initial provisioning; without it, compromised or departed users retain access.

**Independent Test**: As admin, create another admin via invite; change activation; assign roles within policy; attempt to remove last admin and confirm prevention; confirm non-admins cannot reach management screens.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator, **When** they open user management, **Then** they can view accounts with role, activation/verification status, and enough identity fields to distinguish users.
2. **Given** an administrator, **When** they activate, suspend, or deactivate a user, **Then** that user’s ability to authenticate updates accordingly and sessions are revoked on suspend/deactivate.
3. **Given** an administrator, **When** they assign a user’s single primary role among Patient, Doctor, and Administrator, **Then** subsequent authorization decisions reflect that role only (no multi-role accumulation in v1).
4. **Given** an administrator, **When** they invite an additional administrator, **Then** the invitee must verify email and set a password before full Administrator access; no public admin registration exists.
5. **Given** a non-administrator, **When** they request administrator management functions, **Then** the system denies access server-side.
6. **Given** an administrator action that would remove or deactivate the last active administrator, **When** the action is attempted, **Then** the system blocks it.

---

### User Story 7 - Unauthorized access, lockout, and rate limiting (Priority: P1)

Guests and wrongly privileged users cannot reach protected resources; brute-force and credential-stuffing are limited by account lockout and origin rate limits; failures are audited and do not leak sensitive data.

**Why this priority**: Preventing unauthorized access is an explicit business goal and a healthcare security baseline.

**Independent Test**: Call protected actions without a session; cross-role matrix denials; trigger 5 failed logins → 15-minute lock; exceed per-origin login rate limit; confirm CSRF rejection on forged mutating requests; confirm audit events.

**Acceptance Scenarios**:

1. **Given** no valid session, **When** a protected resource is requested, **Then** the system denies access and directs the user to Login (or shows the approved unauthenticated state).
2. **Given** a valid session for role A, **When** a resource requiring role B is requested, **Then** the system denies access without performing the privileged action.
3. **Given** a forged, expired, revoked, or tampered session credential, **When** a protected request is made, **Then** the system rejects the request (server-side session lookup fails).
4. **Given** 5 consecutive failed login attempts against an account, **When** further password logins are attempted, **Then** the account is locked for 15 minutes (unless an administrator unlocks sooner) and lockout is audited.
5. **Given** excessive login attempts from a single network origin, **When** the origin exceeds 20 attempts per 15 minutes, **Then** further attempts from that origin are throttled/rejected temporarily.
6. **Given** a cookie-authenticated mutating request without valid CSRF protection, **When** it is submitted, **Then** the system rejects the mutation.

---

### User Story 8 - Session and device management (Priority: P2)

An authenticated user can view active sessions/devices, revoke a single session or all others, and understand that concurrent sessions are capped. Administrators can force-revoke all sessions for a user.

**Why this priority**: Healthcare accounts are high-value; users and admins need immediate revocation without waiting for absolute expiry.

**Independent Test**: Sign in on multiple clients up to 5; confirm 6th displaces LRU; revoke one session from another device; admin force-logout a user; confirm refresh reuse detection revokes the refresh family.

**Acceptance Scenarios**:

1. **Given** an authenticated user with multiple sessions, **When** they open session/device management, **Then** they see each session’s label, created time, and last activity and can revoke individual sessions.
2. **Given** an authenticated user, **When** they choose to sign out other devices, **Then** all sessions except the current one (and their refresh credentials) are invalidated.
3. **Given** a user already at 5 concurrent sessions, **When** they sign in successfully on a new device, **Then** the least-recently-used session is ended so the cap remains 5.
4. **Given** an administrator, **When** they force-revoke all sessions for a user, **Then** that user must sign in again on every device.
5. **Given** a refresh credential that is reused after rotation (suspected theft), **When** reuse is detected, **Then** the refresh token family is revoked and the user must authenticate again.

---

### User Story 9 - Future OAuth and MFA readiness (Priority: P3)

The authentication design leaves clear extension points so OAuth providers and Multi-Factor Authentication can be added later without redesigning core registration, login, server-side sessions, or flat RBAC. OAuth and MFA are not required to ship in v1.

**Why this priority**: Explicit business goals call for future support; readiness reduces rework, but shipping OAuth/MFA now is out of scope.

**Independent Test**: Confirm account model includes external-identity link placeholders; confirm auth sequence documents a post-password MFA gate; confirm v1 flows complete without OAuth/MFA.

**Acceptance Scenarios**:

1. **Given** the v1 email/password auth flows, **When** product later enables an OAuth provider, **Then** an external identity can be linked to a Hakeem user only after verified-email match, without changing role or bypassing doctor/admin provisioning rules.
2. **Given** a successful primary authentication in a future MFA-enabled configuration, **When** MFA is required for that user/role, **Then** a second verification step runs before a full trusted session is created; Administrators and Doctors are first mandatory cohorts; TOTP is the first planned method.
3. **Given** v1 delivery, **When** users use the product, **Then** they complete auth with email/password (plus email verification / admin provisioning) only—no OAuth or MFA enrollment is required.

---

### Edge Cases

- Registration or login submitted with empty, malformed, or excessively long fields.
- Email verification or password-reset challenge used twice, after expiry, or after account deactivation/suspension.
- User email is fixed at registration in v1 unless an administrator corrects it.
- Concurrent sessions at the 5-session cap; LRU eviction on new login.
- Refresh token reuse after rotation (theft) → revoke entire refresh family.
- Clock skew or delayed email delivery causing multiple verification/reset requests (rate-limited).
- Administrator attempts to delete/deactivate their own sole admin account → blocked.
- Patient tries to register with an email already used by a doctor or admin account → anti-enumeration safe failure.
- Doctor invite accepted after admin has since deactivated or rejected the account → blocked.
- Remember Me disabled but user expects long session → absolute 12-hour / idle rules apply.
- Idle timeout differs for Administrator (15 minutes) vs Patient/Doctor (30 minutes).
- CSRF token missing/invalid on password change, logout, or admin mutations → rejected.
- Localized EN/AR auth screens: validation and error messages clear in both languages; Stitch RTL/LTR without redesign.
- User partially completes registration and abandons — pending accounts do not gain privileged access.
- Password equal to email or in last-5 history → rejected.
- Locked account attempts login during lockout window → denied with lock messaging that does not reveal whether password was correct.

## Requirements *(mandatory)*

### Functional Requirements

#### Identity & roles

- **FR-001**: System MUST support exactly three primary roles for this module: Patient, Doctor, and Administrator.
- **FR-002**: System MUST authenticate users with email and password for v1 (primary credential method).
- **FR-003**: System MUST enforce flat role-based authorization on every protected action using the user’s single primary role and that role’s explicit permissions (no role inheritance).
- **FR-004**: Authorization decisions MUST be enforced server-side; client-side UI hiding MUST NOT be the sole access control.
- **FR-005**: Every authenticated request MUST validate that the server-side session is valid and that the caller is permitted to perform the requested action before returning protected data or performing privileged changes.
- **FR-030**: Each user MUST have exactly one primary role in v1 (Patient, Doctor, or Administrator).
- **FR-031**: Administrator MUST NOT automatically inherit Doctor or Patient clinical permissions; Doctor MUST NOT inherit Administrator permissions.

#### Patient account lifecycle

- **FR-006**: Patients MUST be able to self-register using the approved Stitch registration UI.
- **FR-007**: Patients MUST verify email before full privileged patient access is granted.
- **FR-008**: Patients MUST be able to log in, log out, request forgot-password, reset password via a secure time-limited challenge, and change password while authenticated.
- **FR-009**: Doctors MUST NOT be able to self-register; no public doctor registration flow is provided.
- **FR-032**: Email verification challenges MUST be single-use, expire after 24 hours, and be resend-rate-limited (minimum 60 seconds between sends; maximum 5 per hour per account).

#### Doctor & administrator provisioning

- **FR-010**: Administrators MUST be able to create doctor accounts in Created/Pending Approval state without granting login.
- **FR-011**: Administrators MUST be able to Approve (Active), Reject (with reason), Suspend, and Deactivate doctor and other user accounts as needed for access control.
- **FR-012**: Administrators MUST be able to manage users and assign a single primary role within the Patient / Doctor / Administrator model.
- **FR-013**: Administrators MUST be able to manage permissions at least at role granularity; per-user custom permission matrices are optional and not required for v1.
- **FR-014**: Only Active accounts (and, for Patients and Administrators, email-verified accounts) MUST be allowed to establish a full trusted session for their role.
- **FR-033**: Doctor approval MUST be an explicit Administrator action separate from account creation; approval MUST trigger an invite for the doctor to set their own password.
- **FR-034**: Administrator accounts MUST NOT be publicly self-registered; the first administrator MUST be created via controlled operational bootstrap; additional administrators MUST be invited only by an existing Administrator.
- **FR-035**: System MUST prevent deactivation, role removal, or deletion that would leave zero active Administrators.

#### Sessions, Remember Me & devices

- **FR-015**: System MUST establish a trusted **database-backed (server-side) session** after successful authentication (and after any required verification steps for that account state); the client MUST hold an opaque session identifier, not a self-contained privileged JWT as the sole trust mechanism.
- **FR-016**: Logout MUST invalidate the current session and associated refresh credential so they cannot be reused.
- **FR-036**: Session idle timeout MUST be 30 minutes for Patient and Doctor and 15 minutes for Administrator; absolute session lifetime without Remember Me MUST be 12 hours.
- **FR-037**: Remember Me (when enabled at login) MUST issue a server-stored, rotating opaque refresh credential with absolute lifetime up to 30 days; refresh MUST rotate on use; refresh reuse MUST revoke the token family.
- **FR-038**: Without Remember Me, the system MUST NOT issue long-lived refresh credentials.
- **FR-039**: System MUST allow up to 5 concurrent sessions per user; exceeding the cap MUST end the least-recently-used session.
- **FR-040**: Authenticated users MUST be able to list their sessions/devices and revoke one or all other sessions; Administrators MUST be able to revoke all sessions for any user.
- **FR-041**: Suspend, deactivate, password reset, and refresh-reuse detection MUST revoke affected sessions/refresh credentials such that protected requests fail on the next validation (within the 1-minute revocation SLA in Success Criteria).

#### Credentials & password controls

- **FR-017**: Password reset and email verification challenges MUST be single-use and MUST prevent reuse after success or expiry; password-reset challenges MUST expire after 1 hour.
- **FR-018**: Passwords MUST meet the policy in Assumptions (minimum 12 characters; upper, lower, digit, special; not equal to email/local-part; reject common/breached passwords when feasible; no reuse of last 5 passwords).
- **FR-019**: System MUST protect against credential stuffing and brute force via per-account lockout and per-origin login rate limiting.
- **FR-020**: System MUST NOT store or expose recoverable plaintext passwords.
- **FR-042**: Passwords MUST be stored using a modern adaptive one-way hashing algorithm (Argon2id preferred; bcrypt acceptable equivalent) with unique per-password salting.
- **FR-043**: Successful password reset MUST invalidate all sessions and refresh credentials for that account; successful password change MUST invalidate all other sessions (and their refresh credentials) for that account.
- **FR-044**: After 5 consecutive failed password attempts for an account, the system MUST lock password login for 15 minutes (Administrator may unlock earlier); successful login MUST clear the failure counter.
- **FR-045**: System MUST rate-limit login attempts per network origin to at most 20 attempts per 15 minutes, in addition to per-account lockout.

#### Browser security (cookies & CSRF)

- **FR-046**: Session and refresh cookies MUST be HttpOnly, Secure, and SameSite=Lax by default; Administrator console cookies SHOULD use SameSite=Strict when compatible with approved Stitch flows.
- **FR-047**: System MUST enforce CSRF protection on cookie-authenticated state-changing requests (anti-CSRF token or equivalent server-validated mechanism), in addition to SameSite cookie attributes.

#### Security, privacy & audit

- **FR-021**: System MUST protect authentication and account-management flows with transport security (HTTPS) and secure handling of secrets (session identifiers, refresh credentials, email challenges).
- **FR-022**: Error messages for auth failures MUST avoid leaking whether an email exists when that would enable account enumeration, except where a verified authenticated context already knows the account (e.g., change password).
- **FR-023**: System MUST record security-relevant authentication and access-governance events in an append-only audit log (successful login, failed login, logout, lockout, unlock, password reset request/completion, password change, email verification, refresh reuse revocation, session revoke, activation/deactivation/suspend, doctor approve/reject, role changes, admin invite/create).
- **FR-048**: Security audit events MUST include actor, action, target (when applicable), outcome, timestamp, and available request metadata (network origin / user-agent), and MUST be retained for at least 365 days.
- **FR-024**: Auth screens and admin auth-management screens MUST follow the approved Stitch designs as the single UI source of truth; this module MUST NOT redesign those flows.
- **FR-025**: Auth experience MUST support the platform’s English and Arabic locales consistently with the rest of Hakeem (copy, directionality, and approved layouts).

#### Future extensibility (not v1 delivery)

- **FR-026**: Account model MUST allow future linking of external OAuth identities (provider, subject, linked-at) to a Hakeem user after verified-email match, without changing the RBAC role model or bypassing doctor/admin provisioning.
- **FR-027**: Authentication flow MUST allow a future MFA step after primary credentials succeed and before a full trusted session is issued; when MFA is enabled, Administrators and Doctors are first mandatory cohorts; first planned method is TOTP.
- **FR-028**: OAuth provider login and MFA enrollment/challenge are OUT OF SCOPE for initial delivery of this module; readiness above is mandatory, live providers are not.

#### UI source of truth

- **FR-029**: Visual layout, hierarchy, and interaction patterns for Login (including Remember Me if present in Stitch), Register, Forgot Password, Reset Password, Email Verification, Change Password, session/device management (if present in Stitch or a minimal security addition), and Administrator user/doctor management related to this module MUST match the approved Stitch designs; deviations require explicit product approval. If Stitch lacks session/device management screens, a minimal functional UI may be added solely for security revocation without redesigning existing Stitch auth screens.

### Key Entities

- **User Account**: A person who can authenticate; unique email; password hash (never plaintext); single primary role; activation/approval status; email verification status; failed-login counter; lockout-until; password-history hashes (last 5); timestamps for security events.
- **Role**: One of Patient, Doctor, Administrator; flat (non-inheriting); maps to an explicit permission set.
- **Permission / Access Rule**: A server-enforced rule describing what a role may do; evaluated on protected requests.
- **Session (server-side)**: Database-backed trusted session record bound to a user; opaque identifier presented by the client cookie; idle expiry, absolute expiry, created/last-active, device label, network origin metadata; revoked flag.
- **Refresh Credential**: Optional long-lived opaque credential (Remember Me); stored hashed server-side; rotation version / family id for reuse detection; absolute expiry ≤ 30 days.
- **Email Verification Challenge**: Single-use, 24-hour proof of email control; stored hashed; rate-limited issuance.
- **Password Reset Challenge**: Single-use, 1-hour proof allowing password reset; stored hashed; rate-limited issuance.
- **Doctor Provisioning Record**: Lifecycle state Created → Pending Approval → Active | Rejected | Suspended | Deactivated; approval/rejection metadata; invite status.
- **External Identity Link (future)**: Reserved association of OAuth provider + subject to a User Account; unused in v1 runtime flows.
- **MFA Factor (future)**: Reserved second-factor enrollment record (e.g., TOTP); unused in v1 runtime flows.
- **Security Audit Event**: Append-only record of authentication and access-governance actions for investigation and compliance support (retained ≥ 365 days).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new patient can complete registration and request email verification in under 3 minutes on a typical connection using the approved screens.
- **SC-002**: A verified patient can sign in successfully in under 30 seconds when providing correct credentials on the first attempt.
- **SC-003**: 100% of protected actions attempted without a valid session are denied in automated acceptance checks.
- **SC-004**: 100% of cross-role access attempts in a defined test matrix (Patient → admin resources, Doctor → admin resources, Patient → doctor-only resources, Doctor → patient-only resources) are denied server-side.
- **SC-005**: Doctors cannot complete any public self-registration path; 100% of such attempts are blocked or unavailable in acceptance tests.
- **SC-006**: After administrator suspend/deactivate of an account, that account cannot complete a new login, and existing sessions/refresh credentials for that account stop working on the next request and within 1 minute.
- **SC-007**: Password reset using a valid challenge succeeds on the first correct attempt for at least 95% of scripted recovery tests; expired/reused challenges fail 100% of the time; post-reset, prior sessions fail 100% of the time in those tests.
- **SC-008**: The 5th consecutive failed login locks the account; the 6th attempt within the lock window is denied 100% of the time in lockout tests; lock clears after 15 minutes or admin unlock.
- **SC-009**: Security audit trail contains required events (login success/fail, logout, lockout, password reset completion, email verification, session revoke, doctor approve/reject, admin activation/role change) in end-to-end test runs.
- **SC-010**: Auth UI flows used in acceptance testing are recognizably consistent with the approved Stitch designs (layout sections and primary actions present; no alternate redesign shipped).
- **SC-011**: Auth flows are usable in both English and Arabic, including correct reading direction for Arabic, verified by bilingual acceptance checks on Login and Register.
- **SC-012**: Sessions without Remember Me expire after 30 minutes idle (Patient/Doctor) or 15 minutes idle (Administrator) in timed acceptance tests; absolute 12-hour cap is enforced.
- **SC-013**: Remember Me sessions can be refreshed within 30 days; refresh reuse after rotation revokes the family in 100% of reuse-detection tests.
- **SC-014**: Users cannot maintain more than 5 concurrent sessions; the 6th login displaces an older session in acceptance tests.
- **SC-015**: 100% of forged CSRF mutating requests in the security test suite are rejected.
- **SC-016**: Password storage verification confirms adaptive one-way hashes only (no plaintext) in security review checks.
- **SC-017**: Unapproved (Pending/Rejected) doctor accounts fail login in 100% of provisioning tests; Approved+password-set doctors succeed.

## Assumptions

### Business & scope

- **Primary auth method (v1)**: Email + password only; OAuth and MFA designed for later enablement, not shipped in this module’s first release.
- **UI**: Approved Stitch MCP designs for this module are authoritative; engineering implements those screens, adapting only for accessibility, localization, and technical wiring—not visual redesign. Minimal session/device revocation UI may be added if absent from Stitch, without redesigning existing screens.
- **Scope boundary**: This module covers authentication, server-side session trust, refresh credentials for Remember Me, RBAC enforcement, doctor approval workflow, admin provisioning, audit logging, and related security controls. Clinical features consume identity/permissions but are specified elsewhere.
- **Dependency**: Public website CTAs for Register/Login hand off into this module’s approved auth entry points.
- **Notification**: Verification, reset, doctor invite, and admin invite messages are delivered by email in v1; SMS is out of scope unless later specified.
- **Compliance posture**: Follow healthcare security best practices (least privilege, server-side enforcement, audit logging, secure credential handling, session revocation, CSRF, secure cookies). Formal certification packages are coordinated organizationally and are not blockers for specifying this module.
- **Localization**: Auth module inherits Hakeem’s EN/AR requirement; Stitch screens are implemented in both languages.

### Session, Remember Me, refresh, and storage model

- **Session storage**: Database-backed sessions are mandatory for v1 so administrators and security events can revoke access immediately; pure stateless JWT-as-sole-session is out of scope for v1.
- **Session lifetime**: Idle 30 minutes (Patient/Doctor), idle 15 minutes (Administrator); absolute 12 hours without Remember Me; sliding idle on activity; absolute expiry never extends without Remember Me refresh.
- **Remember Me**: Optional; enables opaque rotating refresh credentials and up to 30-day absolute continuity; disabled by default if Stitch does not pre-check the control.
- **Refresh tokens**: Opaque, hashed at rest, rotated on use, family revocation on reuse; not used as bearer access tokens for APIs in place of session validation.
- **Concurrent sessions**: Max 5; LRU eviction; user and admin revocation supported.
- **Device management**: Session metadata sufficient to identify device/browser and last activity; exact hardware identifiers not required.

### Passwords & challenges

- **Password policy (v1)**: Min 12 chars; upper + lower + digit + special; not email/local-part; common/breached rejection when feasible; last-5 history.
- **Password hashing**: Argon2id preferred; bcrypt acceptable equivalent; unique salt; never plaintext/reversible.
- **Email verification**: Patients (and Administrators) required; 24-hour single-use; resend min 60s / max 5 per hour.
- **Password reset**: 1-hour single-use; anti-enumeration responses; invalidates all sessions + refresh on success.
- **Password change**: Requires current password; invalidates all other sessions + their refresh credentials.

### Abuse controls & browser security

- **Lockout**: 5 consecutive failures → 15-minute account lock; admin unlock allowed; success clears counter.
- **Login rate limiting**: ≤ 20 login attempts / 15 minutes / network origin, plus auth-endpoint throttling.
- **Secure cookies**: HttpOnly + Secure + SameSite=Lax (Strict for admin when compatible).
- **CSRF**: Required for cookie-authenticated mutations.
- **Anti-enumeration**: Registration and forgot-password responses remain safe and generic.

### Roles, doctor approval, admin bootstrap

- **Permissions model (v1)**: Flat RBAC; one primary role per user; role defaults sufficient; no hierarchical inheritance.
- **Doctor onboarding**: Create → Pending Approval → Approve → invite set-password → Active login; Reject/Suspend/Deactivate supported; create ≠ approve.
- **Administrator bootstrap**: First admin via controlled ops/seed; later admins by invite only; email verified; last-admin protection enforced.

### Future OAuth & MFA

- **Future OAuth**: External identity link fields reserved; verified-email match required to link; no role change; cannot bypass doctor approval or admin invite rules.
- **Future MFA**: Post-password gate reserved; Admin + Doctor mandatory first when enabled; Patient optional initially; TOTP first planned method; not shipped in v1.

## Out of Scope

- Live OAuth/social login providers (Google, Apple, etc.) in v1
- Multi-factor authentication enrollment and challenges in v1
- Pure stateless JWT-only session model (no server-side session record) in v1
- Patient clinical workflows beyond identity gates
- Redesigning Stitch-approved auth UI
- Full identity-provider federation / enterprise SSO (future)
- End-user self-service role elevation to Doctor or Administrator
- SMS-based verification or reset in v1
- Per-user custom permission editor beyond role defaults (optional later)
- Biometric/passkey login in v1 (may be considered with future MFA/passwordless work)
