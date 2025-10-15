CREATE TABLE Candidate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    experience_years INTEGER NOT NULL DEFAULT 0,
    recruiter_notes TEXT,
    recruitment_status TEXT NOT NULL,
    consent_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (experience_years >= 0),
    CHECK (recruitment_status IN ('nowy', 'w trakcie rozmow', 'zaakceptowany', 'odrzucony'))
);
