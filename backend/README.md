# Backend Documentation

## 🗄️ Database & Migrations (Alembic)

We use **Alembic** to manage database schema changes. It keeps our database models in sync with the actual PostgreSQL database.

### ⚠️ Golden Rule: The "One Source of Truth"
**DO NOT** create a new "Initial Migration" if one already exists in `alembic/versions/`.
*   **Correct**: Pull the existing migration from Git and apply it.
*   **Incorrect**: Delete `alembic/versions` and run `alembic revision -m "Initial"`. (This breaks everything for everyone else).

---

### 🚀 Getting Started (Daily Workflow)

When you start working or pull changes from Git:

1.  **Update your code**:
    ```bash
    git pull origin main
    ```
2.  **Sync your local DB**:
    ```bash
    docker-compose exec backend alembic upgrade head
    ```
    *This applies any new migrations your teammates pushed.*

---

### 🛠️ Making Database Changes

If you need to modify the database (e.g., add a column to a model):

1.  **Modify the Model**: Edit `app/models/your_model.py`.
    ```python
    # Example: Adding a phone number
    phone = Column(String(20))
    ```

2.  **Generate a Migration Script**:
    ```bash
    docker-compose exec backend alembic revision --autogenerate -m "Add phone to user"
    ```
    *This creates a new file in `alembic/versions/`.*

3.  **Apply the Change Locally**:
    ```bash
    docker-compose exec backend alembic upgrade head
    ```
    *Check if everything works as expected.*

4.  **Commit & Push**:
    ```bash
    git add alembic/versions/YOUR_NEW_FILE.py
    git commit -m "feat: add phone column to user"
    git push
    ```

---

### 💥 Troubleshooting

**"Can't locate revision identified by..."**
*   **Cause**: You might have deleted a migration file that the database thinks is applied, or you are on a different branch.
*   **Fix**:
    1.  Ensure you have all files: `git pull`.
    2.  If strictly necessary (dev only), reset the DB:
        ```bash
        # DANGER: DELETES ALL DATA
        docker-compose exec db psql -U postgres -d matchcota -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        docker-compose exec backend alembic upgrade head
        ```

**"Multiple heads..."**
*   **Cause**: Two people created a migration from the same previous point.
*   **Fix**: `alembic merge heads` (ask for help if unsure).
