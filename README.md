# Silver Connect Backend

This is the core engine and secure API terminal for the **Silver Connect** caregiving ecosystem. It manages the global personnel registry, encrypted identity handshakes, and service deployment authorizations.

## Architectural Features

* **Identity Handshake:** Robust JWT-based authentication with high-entropy Bcrypt password hashing.
* **RBAC (Role-Based Access Control):** Granular middleware protection ensuring specific access levels for **Admins**, **Helpers**, and **Users**.
* **Security Interceptors:** Pre-configured CORS handling and secure headers for cross-origin resource sharing.
* **Automated Identity Recovery:** Integrated **Nodemailer** protocol with cryptographic token generation for secure password resets.
* **Relational Logic:** Advanced Mongoose schema design utilizing `.populate()` to link Users, Bookings, and Performance Audits (Reviews).

## Technical Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB via Mongoose ODM
* **Security:** JSON Web Tokens (JWT) & Crypto
* **Communication:** SMTP via Nodemailer

## Local Installation

1.  **Clone the Registry:**
    ```bash
    git clone https://github.com/batoolamina/silver-connect-backend.git
    cd silver-connect-backend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory and populate it with your credentials:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_secure_jwt_secret
    EMAIL_USER=your_gmail_address
    EMAIL_PASS=your_gmail_app_password
    GOOGLE_CLIENT_ID=your_google_id
    ```

4.  **Launch Terminal:**
    ```bash
    npm start
    ```

## API Reference (Core Endpoints)

### Authentication
| Method | Endpoint | Access | Function |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Create new identity |
| `POST` | `/api/auth/login` | Public | Identity verification & token grant |
| `POST` | `/api/auth/forgot-password` | Public | Dispatch recovery signal |
| `PUT` | `/api/auth/reset-password/:token` | Public | Update cipher via token |

### Operations
| Method | Endpoint | Access | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/verified-helpers` | Public | Retrieve verified specialists |
| `POST` | `/api/bookings/create` | Private | Authorize specialist dispatch |
| `PATCH` | `/api/bookings/:id/status` | Private | Update deployment status |

### Administrative
| Method | Endpoint | Access | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/admin/users` | Admin | Audit full registry |
| `POST` | `/api/auth/admin/verify-helper` | Admin | Approve specialist credentials |

---
Built with passion for the caregiving community. 🔘
