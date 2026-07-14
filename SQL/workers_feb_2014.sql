-- Print details of Workers who joined in February 2014
SELECT *
FROM Worker
WHERE MONTH(JOINING_DATE) = 2
  AND YEAR(JOINING_DATE) = 2014;
