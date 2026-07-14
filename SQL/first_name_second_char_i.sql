-- Fetch records of workers whose first name has 'i' as its second character
SELECT *
FROM Worker
WHERE FIRST_NAME LIKE '_i%';
