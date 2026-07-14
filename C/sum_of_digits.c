#include <stdio.h>

int main() {
    int number, digit, sum = 0;

    /* Read a positive integer */
    scanf("%d", &number);

    /* Add each digit to the sum */
    while (number > 0) {
        digit = number % 10;   /* extract the last digit */
        sum = sum + digit;
        number = number / 10;  /* remove the last digit */
    }

    /* Display the sum of digits */
    printf("%d", sum);

    return 0;
}
