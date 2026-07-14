#include <stdio.h>

/* Swap the values of two variables using pointers */
void swap(int *firstNumber, int *secondNumber) {
    int temp = *firstNumber;
    *firstNumber = *secondNumber;
    *secondNumber = temp;
}

int main() {
    int firstNumber = 10, secondNumber = 20;

    printf("Before swap: firstNumber = %d, secondNumber = %d\n", firstNumber, secondNumber);

    /* Pass the addresses of the variables to swap their values */
    swap(&firstNumber, &secondNumber);

    printf("After swap: firstNumber = %d, secondNumber = %d\n", firstNumber, secondNumber);

    return 0;
}
