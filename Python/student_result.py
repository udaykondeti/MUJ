# Multilevel inheritance: Student -> Marks -> Result

class Student:
    def __init__(self, name, roll):
        self.name = name
        self.roll = roll


class Marks(Student):
    def __init__(self, name, roll, m1, m2, m3):
        super().__init__(name, roll)
        self.m1 = m1
        self.m2 = m2
        self.m3 = m3


class Result(Marks):
    def __init__(self, name, roll, m1, m2, m3):
        super().__init__(name, roll, m1, m2, m3)
        self.total = m1 + m2 + m3
        self.percentage = self.total / 3


s = Result("Aman", 101, 85, 90, 95)

result = {
    "Name": s.name,
    "Roll": s.roll,
    "Total": s.total,
    "Percentage": s.percentage,
}

print("Name:", result["Name"])
print("Roll:", result["Roll"])
print("Total:", result["Total"])
print("Percentage:", result["Percentage"])
