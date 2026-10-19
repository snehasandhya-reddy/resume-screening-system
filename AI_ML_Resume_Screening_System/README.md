# AI + ML Resume Screening System

An interactive resume screening prototype built with Python, Flask, NLP, Sentence Transformers, and scikit-learn. It accepts PDF, DOCX, and TXT resumes, compares each resume with a job description, shows skill gaps, ranks candidates, and exports a CSV report.

## Features
- Interactive dashboard with candidate ranking and score visualizations
- Multi-resume upload (PDF, DOCX, TXT; maximum 10 files per analysis)
- Semantic similarity using `sentence-transformers/all-MiniLM-L6-v2`
- Local TF-IDF similarity fallback if Sentence Transformers cannot load
- Skill extraction and matched/missing skill analysis
- A scikit-learn Logistic Regression classification pipeline
- CSV export
- Responsive interface and demo job description

## Important model limitation
The supervised ML classifier is trained from a small synthetic example dataset included in `app.py` to demonstrate the end-to-end ML pipeline. It is **not a validated hiring model** and must not be used to make real recruitment decisions. For a research-quality project, replace the synthetic examples with a lawful, representative, consented, carefully labeled dataset; split into train/test sets; evaluate precision, recall, F1, calibration, and bias; and document limitations. The score is a screening aid, not a measure of a person's worth or future job performance.

## Requirements
- Python 3.10 or 3.11 recommended
- Internet connection on first use if the Sentence Transformers model needs downloading
- VS Code (recommended)

## Run on Windows
1. Extract the ZIP.
2. Open the `AI_ML_Resume_Screening_System` folder in VS Code.
3. Open Terminal in VS Code.
4. Create and activate a virtual environment:

```powershell
python -m venv .venv
.venv\\Scripts\\activate
```

5. Install packages:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

6. Start the app:

```powershell
python app.py
```

7. Open `http://127.0.0.1:5000` in your browser.

The first analysis may take longer while the embedding model downloads. If it cannot load, the app automatically uses TF-IDF similarity.

## Demo
- Click **Load demo job description**.
- Upload `sample_resumes/data_analyst_resume.txt` and optionally other samples.
- Click **Analyze resumes**.
- Explore the score cards, ranking table, skill gap panel, and export button.

## Project structure
```text
AI_ML_Resume_Screening_System/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── sample_resumes/
│   ├── data_analyst_resume.txt
│   ├── ai_engineer_resume.txt
│   └── marketing_resume.txt
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── app.js
```

## How the blended score is calculated
- 50% semantic similarity
- 30% target-skill coverage
- 20% demo ML classifier probability

These weights are transparent prototype defaults, not empirically validated weights. Recruiters should review the evidence and make final decisions.

## Privacy
Files are processed in memory by this local app and are not saved to a resume folder or database. Do not upload sensitive personal data unless you have permission and understand the environment where the app is running.
