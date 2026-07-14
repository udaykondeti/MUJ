-- PL/SQL program to check whether the number 12321 is a palindrome
DECLARE
    input_number    NUMBER := 12321;
    temp_number     NUMBER := 12321;
    reversed_number NUMBER := 0;
    remainder       NUMBER;
BEGIN
    -- Reverse the number digit by digit
    WHILE temp_number > 0 LOOP
        remainder := MOD(temp_number, 10);
        reversed_number := (reversed_number * 10) + remainder;
        temp_number := TRUNC(temp_number / 10);
    END LOOP;

    -- A number is a palindrome if its reverse equals the original
    IF reversed_number = input_number THEN
        DBMS_OUTPUT.PUT_LINE('number is palindrome');
    ELSE
        DBMS_OUTPUT.PUT_LINE('number is not palindrome');
    END IF;
END;
