import json, os, textwrap

nb = {
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "# GradCompass: University Matcher Data Engineering & Modeling\n",
    "\n",
    "Welcome to the **Two-Stage Recommender System** pipeline for GradCompass!\n",
    "\n",
    "This notebook covers the end-to-end data engineering and modeling workflow you will run in Google Colab (or any environment with your 1.3GB `applications.csv` dataset).\n",
    "\n",
    "## What are we doing here?\n",
    "We are building the \"engine\" behind your university matching feature. Specifically:\n",
    "\n",
    "1.  **Fast Data Ingestion (OLAP):** We use **DuckDB** and **Polars** to read the massive 1.3GB CSV quickly without crashing your laptop's memory.\n",
    "2.  **Data Cleaning & Dimensional Modeling:** We split the messy CSV into clean, logical tables (`programs`, `applications`) that your production PostgreSQL (OLTP) database can easily consume.\n",
    "3.  **Aggregation:** We calculate historical admit rates for every program.\n",
    "4.  **Modeling (The Recommender):** We train a Machine Learning model (Logistic Regression) to calculate the exact probability of an applicant getting admitted to a specific program based on historical data.\n",
    "5.  **Exporting:** We save the clean data and the trained model so your FastAPI backend can load them."
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 0. Setup and Installation\n",
    "First, we install the necessary High-Performance Data Engineering libraries.\n",
    "\n",
    "### Why these tools?\n",
    "*   **DuckDB:** An in-process SQL OLAP database. It is blazing fast at querying CSVs directly from disk without loading them entirely into RAM.\n",
    "*   **Polars:** A lightning-fast DataFrame library written in Rust. It is much faster and more memory-efficient than Pandas for large datasets."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "!pip -q install duckdb polars pyarrow pandas numpy scikit-learn joblib"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### Connect Google Drive (Optional but Recommended)\n",
    "If your 1.3GB CSV is stored in Google Drive, mount it here."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "from google.colab import drive\n",
    "drive.mount('/content/drive')\n",
    "\n",
    "# UPDATE THIS PATH to point to your 1.3GB CSV file\n",
    "CSV_PATH = \"/content/drive/MyDrive/gradcompass/data/applications.csv\"  "
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 1. Fast Ingestion & Exploration (with DuckDB)\n",
    "\n",
    "Instead of loading the entire 1.3GB file into memory with `pandas.read_csv()` (which might crash Colab), we use DuckDB to peek at the data effortlessly."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "import duckdb\n",
    "\n",
    "# Connect to an in-memory DuckDB database\n",
    "con = duckdb.connect()\n",
    "con.execute(\"PRAGMA threads=4;\") # Use multiple CPU cores\n",
    "\n",
    "# Sneak peek: Read just the first 5 rows instantly\n",
    "print(\"Taking a peek at the raw data...\")\n",
    "sample_df = con.execute(f\"\"\"\n",
    "  SELECT * FROM read_csv_auto('{CSV_PATH}', sample_size=100000)\n",
    "  LIMIT 5\n",
    "\"\"\").df()\n",
    "\n",
    "display(sample_df)"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 2. Generating Labels (The \"Target Variable\")\n",
    "\n",
    "In Machine Learning, we need something to predict. Here, we want to predict if a student will be admitted or rejected.\n",
    "\n",
    "We use DuckDB to quickly filter out useless records (like 'shortlisted') and map the rest to a clean `Outcome` column (`Admit` or `Reject`).\n",
    "\n",
    "**Where is this used in the real world?**\n",
    "Every classification model needs labeled data. Netflix maps \"User Watched > 80% of Movie\" to `Outcome: Liked`. Robinhood maps \"User didn't pay back margin\" to `Outcome: Defaulted`."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "ADMIT_STATES = (\"'admitted'\", \"'final'\")\n",
    "REJECT_STATES = (\"'applied'\", \"'waitlisted'\")\n",
    "\n",
    "print(\"Creating the clean 'Outcome' label...\")\n",
    "con.execute(f\"\"\"\n",
    "CREATE OR REPLACE VIEW labeled_data AS\n",
    "SELECT\n",
    "  *,\n",
    "  CASE\n",
    "    WHEN lower(reject_admit_status) IN ({','.join(ADMIT_STATES)}) THEN 'Admit'\n",
    "    WHEN lower(reject_admit_status) IN ({','.join(REJECT_STATES)}) THEN 'Reject'\n",
    "    ELSE 'Other'\n",
    "  END AS Outcome\n",
    "FROM read_csv_auto('{CSV_PATH}', ignore_errors=true)\n",
    "WHERE lower(reject_admit_status) != 'shortlisted';\n",
    "\"\"\")\n",
    "\n",
    "# Check the distribution of our labels\n",
    "distribution = con.execute(\"SELECT Outcome, COUNT(*) AS n FROM labeled_data GROUP BY 1 ORDER BY n DESC\").df()\n",
    "display(distribution)"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 3. Extracting the Clean `Programs` Data\n",
    "\n",
    "A massive 1.3GB CSV has millions of rows, but there are only a few thousand *unique* university programs (e.g., Stanford MSCS is repeated 10,000 times for 10,000 different applicants).\n",
    "\n",
    "**Dimensional Modeling:** We will extract just the unique programs into their own `programs.csv` file. \n",
    "*   **Why?** This tiny file is what you will load into your **PostgreSQL** (OLTP) database to power your Fast API queries quickly.\n",
    "\n",
    "**Where is this used in the real world?**\n",
    "This is called creating a \"Dimension Table\" in Data Warehousing. E-commerce sites separate huge 'Orders' logs from the 'Products' catalog."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "import polars as pl\n",
    "import hashlib\n",
    "\n",
    "# We will use Polars to stream the data from DuckDB, clean it up, and extract unique programs.\n",
    "print(\"Extracting unique University Programs...\")\n",
    "\n",
    "# Note: In a real run, you might want to add Python normalization functions here to clean up 'degree_norm' and 'course_norm'\n",
    "# For this notebook, we'll extract the unique strings provided in the data.\n",
    "\n",
    "programs_query = \"\"\"\n",
    "SELECT DISTINCT\n",
    "    uni_name,\n",
    "    type_of_degree AS degree_norm,\n",
    "    course_name AS course_norm,\n",
    "    global_rank_uni,\n",
    "    tuition_fee_usd,\n",
    "    living_expense,\n",
    "    uni_website_url\n",
    "FROM labeled_data\n",
    "WHERE uni_name IS NOT NULL AND course_name IS NOT NULL;\n",
    "\"\"\"\n",
    "\n",
    "# Fetch into a Pandas Dataframe (since the distinct list should easily fit in memory)\n",
    "programs_df = con.execute(programs_query).df()\n",
    "\n",
    "# Generate a unique ID for each program based on University + Degree + Course\n",
    "def generate_program_id(row):\n",
    "    key = f\"{str(row['uni_name']).lower()}|{str(row['degree_norm']).lower()}|{str(row['course_norm']).lower()}\"\n",
    "    return hashlib.sha1(key.encode('utf-8')).hexdigest()\n",
    "\n",
    "programs_df['program_id'] = programs_df.apply(generate_program_id, axis=1)\n",
    "\n",
    "print(f\"Found {len(programs_df)} unique programs!\")\n",
    "\n",
    "# Save this clean dataset! This goes into PostgreSQL later.\n",
    "programs_df.to_csv(\"programs_clean.csv\", index=False)\n",
    "display(programs_df.head())"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 4. Aggregating Historical Admit Rates (The Baseline Recommender)\n",
    "\n",
    "Before we do Machine Learning, we calculate a simple math formula: What is the historical admit rate for every single program?\n",
    "\n",
    "**Why?** If you have no ML model, you can still rank programs for a user simply by taking the programs they can afford and sorting them by `admit_rate_smoothed`."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "print(\"Calculating historical admit rates... this might take a minute.\")\n",
    "\n",
    "# We compute the admit rates directly in DuckDB and join our new program IDs.\n",
    "# Note: In production, you'd want to join the 'program_id' into the main labeled_data first, but we simulate the grouping here by the text fields.\n",
    "\n",
    "stats_query = \"\"\"\n",
    "SELECT \n",
    "    uni_name,\n",
    "    type_of_degree AS degree_norm,\n",
    "    course_name AS course_norm,\n",
    "    COUNT(*) as n_total,\n",
    "    SUM(CASE WHEN Outcome = 'Admit' THEN 1 ELSE 0 END) as n_admit,\n",
    "    SUM(CASE WHEN Outcome = 'Reject' THEN 1 ELSE 0 END) as n_reject\n",
    "FROM labeled_data\n",
    "WHERE Outcome IN ('Admit', 'Reject')\n",
    "GROUP BY uni_name, type_of_degree, course_name\n",
    "\"\"\"\n",
    "\n",
    "stats_df = con.execute(stats_query).df()\n",
    "\n",
    "# Attach the program IDs\n",
    "stats_df['program_id'] = stats_df.apply(generate_program_id, axis=1)\n",
    "\n",
    "# Calculate the smoothed admit rate (Laplace Smoothing)\n",
    "# We add 'alpha' to numerator and 2*alpha to denominator so that a program with 1 Admit / 1 Total \n",
    "# isn't incorrectly flagged as a 100% admit rate forever.\n",
    "alpha = 10.0 \n",
    "stats_df['admit_rate_smoothed'] = (stats_df['n_admit'] + alpha) / (stats_df['n_total'] + 2 * alpha)\n",
    "\n",
    "stats_df = stats_df[['program_id', 'n_total', 'n_admit', 'n_reject', 'admit_rate_smoothed']]\n",
    "\n",
    "# Save this! This also goes into PostgreSQL.\n",
    "stats_df.to_csv(\"program_stats.csv\", index=False)\n",
    "display(stats_df.head())"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 5. Preparing the Data for Machine Learning\n",
    "\n",
    "Now we get to the fun part. We need to create a `feature_matrix` for our Machine Learning model. The model needs to see the applicant's stats (GRE, GPA, Work Exp) paired against the program they applied to, and whether they got in or not.\n",
    "\n",
    "**Note:** To make this run fast on Colab, we will extract a random subset of 250,000 applications. In production with a huge machine, you'd use all 1.3GB."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "print(\"Preparing the training dataset...\")\n",
    "\n",
    "# We extract the relevant numeric features.\n",
    "features_query = \"\"\"\n",
    "SELECT \n",
    "    undergrad_score,\n",
    "    work_experience,\n",
    "    total_gre_score AS gre_total,\n",
    "    total_toefl_score AS toefl_total,\n",
    "    global_rank_uni AS program_rank,\n",
    "    tuition_fee_usd AS program_tuition,\n",
    "    Outcome\n",
    "FROM labeled_data\n",
    "WHERE Outcome IN ('Admit', 'Reject')\n",
    "LIMIT 250000;\n",
    "\"\"\"\n",
    "\n",
    "training_df = con.execute(features_query).df()\n",
    "\n",
    "import pandas as pd\n",
    "import numpy as np\n",
    "import re\n",
    "\n",
    "def clean_work_exp(x):\n",
    "    if pd.isna(x): return 0.0\n",
    "    s = str(x).lower()\n",
    "    m = re.search(r\"(\\d+)\\s*(month|year)\", s)\n",
    "    if m:\n",
    "        val = float(m.group(1))\n",
    "        if m.group(2) == 'year': val *= 12\n",
    "        return val\n",
    "    try: return float(x) # Fallback if it's just a number\n",
    "    except: return 0.0\n",
    "\n",
    "def clean_float(x):\n",
    "    try:\n",
    "        if isinstance(x, str):\n",
    "             x = re.sub(r\"[^0-9.]\", \"\", x)\n",
    "        return float(x)\n",
    "    except:\n",
    "        return 0.0\n",
    "\n",
    "print(\"Cleaning up messy student data...\")\n",
    "# Clean the data heavily (Machine Learning requires numbers!)\n",
    "training_df['work_experience_months'] = training_df['work_experience'].apply(clean_work_exp)\n",
    "training_df['undergrad_score_clean'] = training_df['undergrad_score'].apply(clean_float)\n",
    "training_df['gre_total_clean'] = training_df['gre_total'].apply(clean_float).fillna(0)\n",
    "training_df['toefl_total_clean'] = training_df['toefl_total'].apply(clean_float).fillna(0)\n",
    "training_df['program_rank_clean'] = training_df['program_rank'].apply(clean_float).fillna(999)\n",
    "training_df['program_tuition_clean'] = training_df['program_tuition'].apply(clean_float).fillna(0)\n",
    "\n",
    "# Map Outcome string to a Binary Integer (1 = Admit, 0 = Reject)\n",
    "training_df['y_target'] = (training_df['Outcome'] == 'Admit').astype(int)\n",
    "\n",
    "feature_cols = [\n",
    "    'undergrad_score_clean', \n",
    "    'work_experience_months', \n",
    "    'gre_total_clean', \n",
    "    'toefl_total_clean',\n",
    "    'program_rank_clean',\n",
    "    'program_tuition_clean'\n",
    "]\n",
    "\n",
    "X = training_df[feature_cols]\n",
    "y = training_df['y_target']\n",
    "\n",
    "display(X.head())"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 6. Training the ML Model (The Ranking Engine)\n",
    "\n",
    "We will train a **Logistic Regression** model. It's fantastic for this because it natively outputs **probabilities** (e.g., \"82% chance\"), which perfectly maps to your Safe / Target / Reach UI categories.\n",
    "\n",
    "**Where is this used in the real world?**\n",
    "This exact architecture (Logistic Regression or XGBoost ranking candidates filtered by a DB) is the backbone of Search & Discovery engines everywhere: **LinkedIn Job Recommendations**, **Airbnb Search Results**, and **Tinder matchmaking**."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "from sklearn.model_selection import train_test_split\n",
    "from sklearn.preprocessing import StandardScaler\n",
    "from sklearn.linear_model import LogisticRegression\n",
    "from sklearn.metrics import roc_auc_score, classification_report\n",
    "import joblib\n",
    "\n",
    "# Standard practice: split data into training and testing sets\n",
    "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\n",
    "\n",
    "print(\"Scaling features...\")\n",
    "scaler = StandardScaler()\n",
    "X_train_scaled = scaler.fit_transform(X_train)\n",
    "X_test_scaled = scaler.transform(X_test)\n",
    "\n",
    "print(\"Training the Logistic Regression Model...\")\n",
    "model = LogisticRegression(class_weight='balanced', max_iter=500)\n",
    "model.fit(X_train_scaled, y_train)\n",
    "\n",
    "# Evaluate how good the model is at predicting\n",
    "predictions_proba = model.predict_proba(X_test_scaled)[:, 1] # Get probabilities of 'Admit'\n",
    "predictions_binary = model.predict(X_test_scaled)\n",
    "\n",
    "auc_score = roc_auc_score(y_test, predictions_proba)\n",
    "print(f\"\\nModel ROC-AUC Score: {auc_score:.3f} (1.0 is perfect, 0.5 is random guessing)\")\n",
    "print(\"\\nClassification Report:\")\n",
    "print(classification_report(y_test, predictions_binary, target_names=['Reject', 'Admit']))"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 7. Export the Assets to GradCompass (The Bridge)\n",
    "\n",
    "We have our clean PostgreSQL setup tables, and we have our trained brain. Let's export them so we can move them over to the FastAPI backend."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Export the actual trained Model weights\n",
    "joblib.dump(model, 'university_matcher_model.pkl')\n",
    "\n",
    "# Export the feature Scaler (so your FastAPI backend can scale user inputs the exact same way)\n",
    "joblib.dump(scaler, 'university_matcher_scaler.pkl')\n",
    "\n",
    "print(\"Pipeline Complete!\")\n",
    "print(\"You now have 4 magical files ready for your backend:\")\n",
    "print(\"1. programs_clean.csv (Load into PostgreSQL)\")\n",
    "print(\"2. program_stats.csv (Load into PostgreSQL)\")\n",
    "print(\"3. university_matcher_model.pkl (Load in FastAPI)\")\n",
    "print(\"4. university_matcher_scaler.pkl (Load in FastAPI)\")"
   ]
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  },
  "language_info": {
   "codemirror_mode": {
    "name": "ipython",
    "version": 3
   },
   "file_extension": ".py",
   "mimetype": "text/x-python",
   "name": "python",
   "nbconvert_exporter": "python",
   "pygments_lexer": "ipython3",
   "version": "3.10.12"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 5
}

path = "/home/ojunias/colossal/GradCompass/gradcompass_university_matcher.ipynb"
with open(path, "w", encoding="utf-8") as f:
    json.dump(nb, f, ensure_ascii=False, indent=1)

print(path)
