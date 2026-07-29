# 🍽️ Restaurant POS & Management System

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2.svg?style=for-the-badge&logo=Google-Gemini&logoColor=white)

A comprehensive, cloud-native Point of Sale (POS) and Enterprise Resource Planning (ERP) web application tailored for the food service industry. Built with modern web technologies, this system streamlines everything from order taking and kitchen dispatching to real-time financial analytics and customer credit management.

## 🚀 Features

### 💻 Core POS & Order Management
*   **Intuitive Checkout:** Agile interface for fast-paced order taking, supporting dining-in, takeout, and delivery (with automated delivery fees).
*   **Split Payments & Multi-Method:** Robust transaction handling for Cash, Bank Transfers, and multi-bank tracking.
*   **Customizable Orders:** Support for variations, add-ons, extras, and specific customer notes dynamically linked to the kitchen.

### 🍳 Real-Time Kitchen Display System (KDS)
*   **Live Kanban Board:** Real-time synchronization of incoming orders, displaying status changes seamlessly across multiple devices using Firebase Firestore real-time listeners.
*   **Status Tracking:** Track orders from 'Pending' to 'Preparing' to 'Ready for Dispatch'.

### 📊 Financial Dashboard & Analytics
*   **Daily Closings (Cierre de Caja):** Automated tracking of physical cash vs. digital transfers.
*   **Intelligent Cash Flow:** Automatically deducts delivery fees and third-party expenses from physical cash expectations.
*   **Actionable Metrics:** Visual metrics for total sales, operational expenses, gross profit, and pending credits.

### 🤖 AI-Powered Daily Menu
*   **Smart Automation:** Integration with Google's Generative AI (Gemini) to automatically generate and suggest attractive daily menus (Menu del Día) with AI-crafted descriptions and pricing structures.

### 👥 Customer Relationship Management (CRM)
*   **Credit Accounts:** Manage recurring customers, track credit lines, register partial payments (abonos), and automatically synchronize debts with pending invoices.
*   **Invoicing:** Professional, printable invoices and receipts with automated consecutive numbering.

## 🛠️ Technology Stack

*   **Frontend Framework:** React 19 (Hooks, Context) 
*   **Build Tool:** Vite (Optimized HMR and bundling)
*   **Routing:** React Router DOM
*   **Backend & Database:** Firebase (Firestore NoSQL, Authentication)
*   **Styling:** Pure Vanilla CSS with a responsive, modern Glassmorphism and Dark Theme aesthetic.
*   **Icons:** Lucide React
*   **Artificial Intelligence:** `@google/generative-ai` SDK

## ⚙️ System Architecture

This application employs a strictly serverless architecture. The React frontend interacts directly with Firebase services, ensuring high availability, zero backend maintenance, and instantaneous multi-device synchronization via Firestore web sockets.

- **Offline-First Capabilities:** Utilizes Firestore's persistent local cache to ensure the POS remains fully functional even during temporary internet outages.
- **Role-Based Security:** Authentication layers ensuring only authorized personnel can access sensitive financial data.

## 💻 Local Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/restaurant-pos-system.git
   cd restaurant-pos-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   You will need to connect this to your own Firebase project.
   Open `src/firebase.js` and replace the `firebaseConfig` object with your project credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 🔒 Security Note
*For demonstration purposes in this portfolio, sensitive API keys may be omitted or restricted. In a production environment, Firebase security rules are strictly implemented to prevent unauthorized database read/writes.*

---
*Designed and developed by [Your Name/Handle]*
