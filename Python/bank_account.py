class InsufficientBalanceError(Exception):
    pass


class BankAccount:
    def __init__(self):
        self.balance = 5000

    def withdraw(self, amount):
        if amount > self.balance:
            raise InsufficientBalanceError("Insufficient balance!")
        self.balance -= amount
        print("Updated balance:", self.balance)


account = BankAccount()
amount = int(input("Enter amount to withdraw: "))

try:
    account.withdraw(amount)
except InsufficientBalanceError as e:
    print(e)
