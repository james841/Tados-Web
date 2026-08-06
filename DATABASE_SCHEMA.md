# Tados Web Database Schema Explained

This document explains how your database is structured, how categories link to products, and what each table row means.

---

## How Categories Link to Products

The relationship between **categories** and **products** is straightforward:

- Every **product** has a `categoryId` field that points to exactly one **category**.
- A **category** can have many products (a one-to-many relationship).

### Example from your seeded data:

```
Category: "Smart Locks" (slug: smart-locks, id: abc123)
  ↓
Product: "3D Facial Recognition Door Lock" (categoryId: abc123)
Product: "Fingerprint Smart Door Lock" (categoryId: abc123)
Product: "Smart JAM Lock" (categoryId: abc123)
```

When you query all products in the "Smart Locks" category, Prisma finds every product where `categoryId` matches the category's `id`.

---

## Category Self-Relation (Parent → Children)

Categories have a **hierarchical structure** using a **self-referential relationship**:

- A category can have a `parentId` that points to another category.
- Parent categories (like "Smart Locks") have `parentId = null`.
- Child categories (like "Facial Recognition Locks") have a `parentId` pointing to their parent.

### Example:

```
Parent Category: "Smart Locks" (id: abc123, parentId: null)
  ↓
  Child: "Facial Recognition Locks" (id: xyz789, parentId: abc123)
  Child: "Fingerprint Door Locks" (id: def456, parentId: abc123)
  Child: "Gate & JAM Locks" (id: ghi789, parentId: abc123)
```

This structure powers:
- The **header dropdown** (showing parent + children)
- **Category pages** (showing sub-category chips)
- **Breadcrumb navigation**

---

## Every Table Row Explained

### 1. **User** (Authentication)

| Column         | Type      | What it stores                                      |
|----------------|-----------|-----------------------------------------------------|
| `id`           | String    | Unique identifier (cuid)                            |
| `name`         | String?   | User's full name (optional)                         |
| `email`        | String    | Email address (unique, used for login)              |
| `emailVerified`| DateTime? | When email was verified (for OAuth)                 |
| `image`        | String?   | Profile picture URL (from OAuth providers)          |
| `passwordHash` | String?   | Bcrypt-hashed password (only for credentials login) |
| `phone`        | String?   | Phone number                                        |
| `role`         | Enum      | `CUSTOMER` or `ADMIN`                               |
| `createdAt`    | DateTime  | When account was created                            |
| `updatedAt`    | DateTime  | Last modified                                       |

**Relations:**
- Has many `accounts` (OAuth providers like Google)
- Has many `sessions` (active login sessions)
- Has many `orders` (purchase history)
- Has many `addresses` (saved shipping addresses)
- Has many `reviews` (product ratings)
- Has many `wishlist` items

---

### 2. **Account** (OAuth Connections)

| Column            | Type    | What it stores                                    |
|-------------------|---------|---------------------------------------------------|
| `id`              | String  | Unique identifier                                 |
| `userId`          | String  | Links to User                                     |
| `type`            | String  | Always "oauth" for Google                         |
| `provider`        | String  | "google", "credentials", etc.                     |
| `providerAccountId` | String | User's ID at the provider (e.g., Google user ID)|
| `access_token`    | String? | OAuth access token (encrypted)                    |
| `refresh_token`   | String? | OAuth refresh token                               |
| `expires_at`      | Int?    | Token expiration timestamp                        |

**Why it exists:** Allows users to sign in with Google while still linking to the same User record if they later set a password.

---

### 3. **Category**

| Column       | Type    | What it stores                                          |
|--------------|---------|---------------------------------------------------------|
| `id`         | String  | Unique identifier                                       |
| `name`       | String  | Display name ("Smart Locks")                            |
| `slug`       | String  | URL-safe name ("smart-locks")                           |
| `description`| String? | Marketing copy for the category page                    |
| `image`      | String? | Hero image URL                                          |
| `icon`       | String? | Lucide icon name ("Lock", "Shield", etc.)               |
| `position`   | Int     | Sort order in navigation                                |
| `featured`   | Boolean | Show in featured sections?                              |
| `parentId`   | String? | Links to parent category (null = top-level)             |

**Relations:**
- Belongs to one `parent` category (or null)
- Has many `children` categories
- Has many `products`

---

### 4. **Brand**

| Column | Type   | What it stores                         |
|--------|--------|----------------------------------------|
| `id`   | String | Unique identifier                      |
| `name` | String | Brand name ("Tuya", "Aqara", "Sonoff") |
| `slug` | String | URL-safe name                          |
| `logo` | String?| Logo image URL                         |

**Relations:**
- Has many `products`

---

### 5. **Product**

| Column          | Type     | What it stores                                        |
|-----------------|----------|-------------------------------------------------------|
| `id`            | String   | Unique identifier                                     |
| `name`          | String   | Product name                                          |
| `slug`          | String   | URL-safe name ("smart-jam-lock")                      |
| `sku`           | String   | Stock keeping unit (unique)                           |
| `tagline`       | String?  | Short marketing line for cards                        |
| `description`   | String   | Full product description (supports Markdown)          |
| `price`         | Decimal  | Current price in ZAR                                  |
| `compareAtPrice`| Decimal? | Original price (if on sale)                           |
| `costPrice`     | Decimal? | Your cost (for margin calculations)                   |
| `stock`         | Int      | Available quantity                                    |
| `lowStockAt`    | Int      | Threshold to show "Low stock" badge                   |
| `isActive`      | Boolean  | Show on site?                                         |
| `isFeatured`    | Boolean  | Show in "Featured Collection"?                        |
| `isBestseller`  | Boolean  | Show in "Bestsellers"?                                |
| `isNewArrival`  | Boolean  | Show in "New Arrivals"?                               |
| `ratingAvg`     | Float    | Average rating (0-5)                                  |
| `ratingCount`   | Int      | Number of reviews                                     |
| `features`      | JSON?    | Feature bullets (e.g., `["3D face unlock", "PIN"]`)   |
| `specs`         | JSON?    | Technical specs (e.g., `{"battery": "6 months"}`)     |
| `metaTitle`     | String?  | SEO title override                                    |
| `metaDescription`| String? | SEO description override                              |
| `categoryId`    | String   | **Links to Category** (THIS IS THE LINK YOU ASKED ABOUT)|
| `brandId`       | String?  | Links to Brand (optional)                             |

**Relations:**
- Belongs to one `category`
- Belongs to one `brand` (optional)
- Has many `images`
- Has many `reviews`
- Has many `orderItems` (in past orders)
- Has many `wishlist` entries

---

### 6. **ProductImage**

| Column     | Type   | What it stores                       |
|------------|--------|--------------------------------------|
| `id`       | String | Unique identifier                    |
| `productId`| String | Links to Product                     |
| `url`      | String | Image path (`/products/lock-1.jpg`)  |
| `alt`      | String?| Alt text for accessibility           |
| `position` | Int    | Display order (0 = main image)       |

---

### 7. **Order**

| Column       | Type     | What it stores                             |
|--------------|----------|--------------------------------------------|
| `id`         | String   | Unique identifier                          |
| `orderNumber`| String   | Human-friendly number (e.g., "ORD-9932")   |
| `userId`     | String?  | Links to User (null for guest checkout)    |
| `email`      | String   | Customer email (for guest orders)          |
| `phone`      | String?  | Customer phone                             |
| `addressId`  | String?  | Links to saved Address                     |
| `subtotal`   | Decimal  | Sum of (price × quantity) for all items    |
| `shipping`   | Decimal  | Delivery fee (R0 if above R1500)           |
| `tax`        | Decimal  | VAT (15%, already included in prices)      |
| `discount`   | Decimal  | Coupon discount                            |
| `total`      | Decimal  | Final amount paid                          |
| `status`     | Enum     | `PENDING`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED` |
| `notes`      | String?  | Admin notes or special instructions        |

**Relations:**
- Belongs to one `user` (or null)
- Belongs to one `address`
- Has many `items` (OrderItem)
- Has one `payment` record

---

### 8. **OrderItem** (Snapshot of product at purchase time)

| Column     | Type    | What it stores                                |
|------------|---------|-----------------------------------------------|
| `id`       | String  | Unique identifier                             |
| `orderId`  | String  | Links to Order                                |
| `productId`| String  | Links to Product                              |
| `name`     | String  | Product name *at time of purchase*            |
| `sku`      | String  | SKU *at time of purchase*                     |
| `image`    | String? | Main product image *at time of purchase*      |
| `price`    | Decimal | Unit price *at time of purchase* (not current)|
| `quantity` | Int     | How many were ordered                         |

**Why snapshot?** If you later change a product's name or price, past orders must still show what the customer actually bought.

---

### 9. **Payment**

| Column        | Type    | What it stores                               |
|---------------|---------|----------------------------------------------|
| `id`          | String  | Unique identifier                            |
| `orderId`     | String  | Links to Order (1:1 relationship)            |
| `provider`    | String  | Always "payfast" for now                     |
| `status`      | Enum    | `PENDING`, `COMPLETE`, `FAILED`, `CANCELLED` |
| `amount`      | Decimal | Total charged (must match Order.total)       |
| `pfPaymentId` | String? | PayFast's internal transaction ID            |
| `signature`   | String? | MD5 signature from PayFast ITN               |
| `rawPayload`  | JSON?   | Full ITN payload (for audit/debugging)       |

---

### 10. **Address**

| Column      | Type   | What it stores                                 |
|-------------|--------|------------------------------------------------|
| `id`        | String | Unique identifier                              |
| `userId`    | String?| Links to User (null for one-time guest address)|
| `firstName` | String | First name                                     |
| `lastName`  | String | Last name                                      |
| `phone`     | String | Contact number                                 |
| `line1`     | String | Street address                                 |
| `line2`     | String?| Apt/suite/building                             |
| `city`      | String | City                                           |
| `province`  | String | Province (e.g., "Gauteng")                     |
| `postalCode`| String | Postal code                                    |
| `country`   | String | Always "South Africa" for now                  |

**Relations:**
- Belongs to one `user` (or null)
- Has many `orders`

---

### 11. **Review**

| Column     | Type    | What it stores                        |
|------------|---------|---------------------------------------|
| `id`       | String  | Unique identifier                     |
| `productId`| String  | Links to Product                      |
| `userId`   | String  | Links to User                         |
| `rating`   | Int     | 1-5 stars                             |
| `title`    | String? | Review headline                       |
| `body`     | String? | Review text                           |
| `approved` | Boolean | Admin-approved? (default true)        |
| `createdAt`| DateTime| When posted                           |

**Unique constraint:** One review per user per product.

---

### 12. **WishlistItem**

| Column     | Type    | What it stores      |
|------------|---------|---------------------|
| `id`       | String  | Unique identifier   |
| `userId`   | String  | Links to User       |
| `productId`| String  | Links to Product    |
| `createdAt`| DateTime| When added          |

**Unique constraint:** One entry per user per product.

---

## Visual Summary: How Data Flows

```
User
 ├── signs in with Google → creates Account record
 ├── adds Product to cart (client-side, not DB)
 ├── goes to checkout → creates Order
 │    └── Order contains OrderItem records (product snapshots)
 │    └── Order links to Address
 │    └── Order links to Payment
 └── writes Review for Product

Category (parent)
 ├── has many child Categories
 └── has many Products

Product
 ├── belongs to one Category ← THIS IS THE LINK
 ├── belongs to one Brand
 ├── has many ProductImages
 └── has many Reviews
```

---

## Making Changes from the Admin Section

Once the admin dashboard is built (currently TODO), you'll be able to:

1. **Create/Edit Products:**
   - Choose a category from a dropdown (populated from the `Category` table)
   - Choose a brand from a dropdown (populated from the `Brand` table)
   - Set price, stock, images, features
   - Click "Save" → creates or updates a `Product` row

2. **Create/Edit Categories:**
   - Set name, slug, description, icon
   - Choose a parent category (or leave null for top-level)
   - Click "Save" → creates or updates a `Category` row

3. **Manage Orders:**
   - View all orders in a table
   - Click an order → see OrderItems, customer details, payment status
   - Update `Order.status` (e.g., `PROCESSING` → `SHIPPED`)

4. **View Customers:**
   - List all users
   - Filter by role (`CUSTOMER` vs `ADMIN`)
   - Promote a customer to admin by changing `User.role`

All of this will use **Prisma mutations** from server actions or API routes. The schema is already ready — the admin UI just needs to be built.

---

## Questions?

If anything is unclear, just ask. The key takeaway:

**`Product.categoryId` is a foreign key that points to `Category.id`.**

That's the entire link. When you query for products in "Smart Locks", Prisma finds every product where `categoryId` matches the "Smart Locks" category's `id`.
