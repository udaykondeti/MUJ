import sqlite3

# Connect to (and create) the company database.
connection = sqlite3.connect("company.db")
cursor = connection.cursor()

# Create the EMP_DATA table with three fields.
cursor.execute("""CREATE TABLE IF NOT EXISTS EMP_DATA (
    EMP_ID INTEGER PRIMARY KEY,
    NAME TEXT,
    DEPARTMENT TEXT
)""")

# Insert data for 3 employees.
employees = [
    (101, "Aman", "Finance"),
    (102, "Vimal", "Account"),
    (103, "Rohit", "Production"),
]
cursor.executemany("INSERT OR REPLACE INTO EMP_DATA VALUES (?, ?, ?)", employees)

# Update the DEPARTMENT of the employee with ID 102 to "STORE".
cursor.execute("UPDATE EMP_DATA SET DEPARTMENT = ? WHERE EMP_ID = ?", ("STORE", 102))
connection.commit()

# Print the updated row.
cursor.execute("SELECT * FROM EMP_DATA WHERE EMP_ID = ?", (102,))
print(cursor.fetchone())

connection.close()
