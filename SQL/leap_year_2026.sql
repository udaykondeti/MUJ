-- PL/SQL program to check whether the year 2026 is a leap year
DECLARE
    input_year NUMBER := 2026;
BEGIN
    -- A year is a leap year if it is divisible by 4 and
    -- (not divisible by 100, unless also divisible by 400)
    IF MOD(input_year, 4) = 0
       AND (MOD(input_year, 100) != 0 OR MOD(input_year, 400) = 0) THEN
        DBMS_OUTPUT.PUT_LINE(input_year || ' is a leap year.');
    ELSE
        DBMS_OUTPUT.PUT_LINE(input_year || ' is not a leap year.');
    END IF;
END;
