# Security Specification for FaceLinkUp

## Data Invariants
1. A user can only edit their own profile.
2. Only recruiters can create jobs.
3. Only freelancers can apply for jobs.
4. Posts can only be created by authenticated users, and edited/deleted by their authors.
5. Connections must involve the authenticated user.
6. Notifications can only be read by the recipient.

## The Dirty Dozen Payloads
1. **Profile Spoofing**: User A attempts to update User B's profile.
2. **Role Escalation**: User A attempts to change their role to 'admin' (not supported by schema, but checking).
3. **Ghost Application**: User A applies for a job on behalf of User B.
4. **Recruiter Impersonation**: A freelancer attempts to create a job listing.
5. **Post Hijacking**: User A attempts to edit User B's post.
6. **Shadow Notification**: User A attempts to read User B's notifications.
7. **Invalid Job State**: User attempts to update a job's status to 'hired' without a valid application process.
8. **Resource Poisoning**: Attacker injects a massive string into a `bio` field.
9. **Identity Poisoning**: Attacker attempts to use a 2MB string as a Document ID.
10. **Application Overwrite**: User A tries to overwrite User B's application in `jobs/{jobId}/applications/{appId}`.
11. **Connection Forgery**: User A attempts to 'accept' a connection they didn't receive.
12. **PII Leak**: Unauthenticated user attempts to list all users' emails.

## Test Runner (Conceptual)
All the above must return `PERMISSION_DENIED`.
