# Server-Side Setup

This folder contains Python scripts for backend database management and development.

## Prerequisites

- Python 3.8+
- pip or virtualenv
- Appwrite account and project

## Setup Instructions

### 1. Create Virtual Environment (Recommended)

```bash
cd server_side
python -m venv venv

# Activate venv
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 2. Install Dependencies

All scripts use `node-appwrite` Python SDK. Install via pip:

```bash
pip install appwrite
```

### 3. Configure Credentials

Each Python script contains placeholders for Appwrite credentials:

```python
APPWRITE_PROJECT_ID = "YOUR_PROJECT_ID_HERE"
APPWRITE_API_KEY = "YOUR_API_KEY_HERE"
APPWRITE_ENDPOINT = "https://your-appwrite-server/v1"
DATABASE_ID = "your_database_id"
```

**Replace these values with your actual Appwrite project details:**

1. Get your **Appwrite Project ID** from [Appwrite Console](https://cloud.appwrite.io)
2. Generate an **API Key** in Appwrite:
   - Go to **Settings → API Keys**
   - Create a new key with appropriate scopes (databases, documents read/write)
3. Your **Appwrite Endpoint** is typically `https://cloud.appwrite.io/v1` or your self-hosted URL

### 4. Update All Scripts

Find and replace credentials in all Python files:

```bash
# Replace PROJECT_ID in all scripts
find . -name "*.py" -type f -exec sed -i 's/YOUR_PROJECT_ID_HERE/your_actual_project_id/g' {} +

# Replace API_KEY in all scripts
find . -name "*.py" -type f -exec sed -i 's/YOUR_API_KEY_HERE/your_actual_api_key/g' {} +

# Replace DATABASE_ID
find . -name "*.py" -type f -exec sed -i 's/your_database_id/actual_database_id/g' {} +
```

Or manually edit each script file with your credentials.

## Available Scripts

### db-schema-creatation-use-venv-samefolder/

Setup and manage Appwrite database schemas:

- **appwrite_db_setup.py** — Initialize database collections and schema
- **appwrite_db_get_current_schema.py** — Retrieve current database schema
- **add_testing_data_to_autofill.py** — Add sample test data
- **add_specific_tire_data_to_autofill.py** — Add tire product data
- **add_radius_to_autofill.py** — Add radius/size data

### permission/

Manage role-based permissions:

- **permission_setup.py** — Configure permissions in Appwrite
- **permission_print.py** — Display current permissions
- **document_permission_demo.py** — Demo permission checks

## Running Scripts

```bash
# Ensure venv is activated
source venv/bin/activate  # or: venv\Scripts\activate on Windows

# Run a script
python db-schema-creatation-use-venv-samefolder/appwrite_db_setup.py

# Run permission scripts
python permission/permission_setup.py
```

## Security Notes

⚠️ **IMPORTANT:**
- **Never commit `.env`, `database-connection-info`, or scripts with real API keys**
- Use environment variables or `.env` files for sensitive data
- Each developer should have their own `.env` file (not committed to git)
- Rotate API keys regularly

## Troubleshooting

### Module not found: `appwrite`

```bash
# Ensure you're in the venv
which python  # Should show venv/bin/python

# Reinstall
pip install appwrite
```

### Connection errors

- Verify your `APPWRITE_ENDPOINT` is correct
- Check your `APPWRITE_API_KEY` has appropriate scopes
- Ensure your Appwrite server is running and accessible

### Permission denied

```bash
# Make scripts executable (Mac/Linux)
chmod +x *.py db-schema-creatation-use-venv-samefolder/*.py
```

## Questions?

Refer to [Appwrite Python SDK Documentation](https://appwrite.io/docs/sdks/python).
