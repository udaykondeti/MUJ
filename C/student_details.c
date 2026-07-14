#include <stdio.h>

/* Structure to store student details */
struct Student {
    char name[50];
    int id;
    float percentage;
};

int main() {
    /* Create a student and store the details */
    struct Student student;

    /* Read the student details */
    scanf("%s", student.name);
    scanf("%d", &student.id);
    scanf("%f", &student.percentage);

    /* Display the student details */
    printf("Name: %s\n", student.name);
    printf("ID: %d\n", student.id);
    printf("Percentage: %.2f\n", student.percentage);

    return 0;
}
