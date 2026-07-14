# Multilevel inheritance: Student -> Marks -> Result

class Student:
    def __init__(self, name, roll_number):
        self.name = name
        self.roll_number = roll_number


class Marks(Student):
    def __init__(self, name, roll_number, marks):
        super().__init__(name, roll_number)
        self.marks = marks  # list of 3 subject marks


class Result(Marks):
    def __init__(self, name, roll_number, marks):
        super().__init__(name, roll_number, marks)
        self.total = sum(self.marks)
        self.percentage = self.total / len(self.marks)

    def get_result(self):
        # Store the final output in a dictionary.
        return {
            "Name": self.name,
            "Roll Number": self.roll_number,
            "Marks": self.marks,
            "Total": self.total,
            "Percentage": self.percentage,
        }


student = Result("Aman", 101, [85, 90, 95])
result = student.get_result()

# Display all student details in a proper format.
for key, value in result.items():
    print(f"{key}: {value}")
