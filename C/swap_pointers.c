#include <stdio.h>

/* Swap the values of two variables using pointers */
void swap(int *firstNum, int *secondNum);

int main() {
    int firstNum, secondNum;

    /* Read the two numbers */
    scanf("%d %d", &firstNum, &secondNum);

    /* Swap using pointers */
    swap(&firstNum, &secondNum);

    /* Print the swapped values */
    printf("%d %d", firstNum, secondNum);

    return 0;
}

void swap(int *firstNum, int *secondNum) {
    int temp = *firstNum;
    *firstNum = *secondNum;
    *secondNum = temp;
}
