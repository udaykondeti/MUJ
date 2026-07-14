#include <stdio.h>

int main() {
    int count, index;

    /* Read the number of elements */
    scanf("%d", &count);

    int numbers[count];

    /* Read the list of integers */
    for (index = 0; index < count; index++) {
        scanf("%d", &numbers[index]);
    }

    /* Assume the first element is both the largest and smallest */
    int largest = numbers[0];
    int smallest = numbers[0];

    /* Compare each element to update largest and smallest */
    for (index = 1; index < count; index++) {
        if (numbers[index] > largest) {
            largest = numbers[index];
        }
        if (numbers[index] < smallest) {
            smallest = numbers[index];
        }
    }

    /* Display the largest and smallest numbers */
    printf("Largest = %d\n", largest);
    printf("Smallest = %d\n", smallest);

    return 0;
}
