-- Fetch the departments that have less than four workers in them
SELECT DEPARTMENT, COUNT(*) AS num_workers
FROM Worker
GROUP BY DEPARTMENT
HAVING COUNT(*) < 4;
