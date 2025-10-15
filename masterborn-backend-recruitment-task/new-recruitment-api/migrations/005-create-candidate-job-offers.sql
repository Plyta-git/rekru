CREATE TABLE CandidateJobOffer (
    candidate_id INTEGER NOT NULL,
    job_offer_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (candidate_id, job_offer_id),
    FOREIGN KEY (candidate_id) REFERENCES Candidate(id) ON DELETE CASCADE,
    FOREIGN KEY (job_offer_id) REFERENCES JobOffer(id) ON DELETE CASCADE
);
