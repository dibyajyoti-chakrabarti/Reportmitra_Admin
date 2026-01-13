# ReportMitra – Admin Portal Documentation

## 1. Introduction

The **ReportMitra Admin Portal** is a dedicated administrative interface designed to enable government officials and departmental administrators to efficiently manage, track, and resolve citizen-reported issues submitted through the ReportMitra platform.

The admin portal is hosted at:


This portal is strictly role-based and is intended only for authorized administrative personnel. It acts as the operational backbone of the ReportMitra ecosystem, bridging citizen reports with departmental resolution workflows.

---

## 2. Authentication & Authorization

### 2.1 Login Mechanism

Admins authenticate using a **User ID and Password** combination. Authentication is implemented using **JWT (JSON Web Tokens)** via **Django REST Framework SimpleJWT**.

Key characteristics of the authentication system:
- Stateless authentication
- Access token + refresh token architecture
- Token-based session persistence across page reloads
- Automatic token validation on protected routes
- Secure logout via token invalidation

This approach ensures:
- Scalability (no server-side session storage)
- Improved performance
- Compatibility with distributed systems and microservice-ready architectures

---

## 3. Role-Based Access Control (RBAC)

The admin portal follows a **strict role hierarchy**, enforcing access control at both the frontend (UI-level) and backend (API-level).

### 3.1 Admin Roles

#### Root Admin
The root admin has **superuser-level privileges**, including:
- Full access to all dashboard sections
- Cross-departmental visibility
- Ability to create, activate, deactivate, and delete admin accounts
- Access to system-wide audit logs
- Ownership of urgent and escalated issues

#### Standard Admin
A standard admin is a **department-bound user** with limited privileges:
- Can only view issues assigned to their department
- Can claim and resolve issues
- Cannot manage accounts
- Cannot access logs
- Cannot view or handle escalated urgent issues

---

## 4. Dashboard Module

### 4.1 Purpose

The **Dashboard** acts as the central command center for admins. It provides a high-level operational overview and quick navigation to all relevant modules.

### 4.2 Dynamic Dashboard Rendering

The dashboard UI is **dynamically rendered** based on the authenticated user's role:
- Root admins see all system modules
- Standard admins see only operational modules

### 4.3 Information Displayed

The dashboard may include:
- Total number of issues
- Issues by status (Pending, In Progress, Urgent, Resolved)
- Department-specific issue metrics
- Quick access shortcuts
- Visual indicators for urgent issues
- Recent activity summaries

---

## 5. Issue Management System

Issue management is the **core functional pillar** of the admin portal.

### 5.1 Issue Lifecycle & States

Each issue transitions through the following states:

1. **Pending**
   - Default state when a citizen submits a report
   - Unclaimed and awaiting action

2. **In Progress**
   - Triggered when an admin claims responsibility
   - Locks the issue to that admin
   - Prevents parallel handling

3. **Urgent**
   - Used when an admin determines the issue cannot be resolved at their level
   - Automatically escalates ownership to the root admin
   - Removed from standard admin visibility

4. **Resolved**
   - Final state after successful resolution
   - Requires proof of completion

---

## 6. Issue List Section

### 6.1 Listing & Sorting

- Issues are listed chronologically by **date of reporting**
- Server-side filtering ensures only authorized issues are fetched
- Pagination optimizes performance for large datasets

### 6.2 Issue Detail View

Upon clicking an issue, admins can view:
- Full report metadata
- Citizen-submitted description
- Location data
- Uploaded evidence images
- Department assignment
- Current status and timestamps

### 6.3 Completion Workflow

Admins can:
- Upload a **completion image**
- Update issue status
- Add resolution remarks (if applicable)

This ensures transparency and verifiable resolution.

---

## 7. Urgent Issues Module

### 7.1 Escalation Logic

When an issue is marked as urgent:
- Ownership is transferred to the root admin
- The issue becomes invisible to standard admins
- Priority handling is enforced

### 7.2 Visibility Rules

- Only urgent issues appear in this section
- Root admin has full control over resolution

---

## 8. Issue History Module

### 8.1 Purpose

The Issue History section serves as a **read-only archive** of all resolved issues.

### 8.2 Use Cases

- Auditing past resolutions
- Performance analysis
- Accountability tracking
- Historical reporting

---

## 9. Account Management System (Root Admin Only)

### 9.1 Account Creation

Root admins can:
- Create admin accounts using a **random credential generator**
- Assign accounts to specific departments
- Enforce departmental isolation

### 9.2 Account Deletion

- All users are fetched dynamically
- Deletion is a controlled, irreversible action
- Prevents orphaned or inactive accounts

### 9.3 Activation & Deactivation

- Accounts can be toggled between active/inactive
- Useful for:
  - Temporary suspensions
  - Administrative reshuffling
  - Security enforcement

---

## 10. Logs & Audit Trail

### 10.1 Logging Strategy

The system maintains a comprehensive **audit log**, tracking:
- Account creation
- Account deletion
- Status toggles
- Login activity
- Issue escalations

### 10.2 Importance

This module ensures:
- Accountability
- Security auditing
- Compliance readiness
- Debugging and forensics

---

## 11. Frontend Architecture

- Built using **Vite + React (JavaScript)**
- Styled with **Tailwind CSS**
- Component-driven architecture
- Modular, reusable UI components
- Protected routes with auth guards
- API-driven rendering

---

## 12. Backend Architecture

- **Django REST Framework**
- RESTful API design
- Token-based authentication (SimpleJWT)
- Centralized validation and permission handling
- Unified backend for admin + citizen portals

---

## 13. Database Design

- **Single unified MySQL database**
- Hosted on **Amazon RDS**
- Shared schema for admin and citizen data
- Ensures data consistency and integrity
- Optimized queries for read-heavy workloads

---

## 14. Cloud Infrastructure & Deployment

### 14.1 Hosting & Networking

- **AWS EC2** for backend services
- **Amazon S3** for frontend hosting
- Separate S3 buckets for admin and citizen portals
- **CloudFront CDN** for low-latency global delivery
- **Route 53** for DNS management

### 14.2 Security

- HTTPS enforced via **AWS Certificate Manager**
- SSL/TLS termination at CloudFront
- Certbot used for `www` domain handling

---

## 15. CI/CD Pipeline

- Automated deployment triggered on `main` branch pushes
- Ensures zero-manual deployment
- Reduces human error
- Enables rapid iteration and fixes

---

## 16. Cost Optimization Strategy

To minimize AWS operational costs:
- A **cron-based automation pipeline** is implemented
- Admin backend:
  - Starts automatically at **11:00 AM IST**
  - Stops automatically at **1:00 PM IST**
- Optimized for working-hour usage patterns

---

## 17. Conclusion

The ReportMitra Admin Portal is a **secure, scalable, cloud-native administrative system** built with modern web technologies and best practices. It emphasizes:
- Role-based security
- Operational efficiency
- Transparency
- Cost optimization
- Maintainability and scalability

This portal plays a critical role in ensuring timely resolution of citizen issues and maintaining trust in the ReportMitra platform.

---
