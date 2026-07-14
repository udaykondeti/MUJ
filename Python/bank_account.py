class InsufficientBalanceException(Exception):
    pass


class BankAccount:
    def __init__(self):
        self.balance = 5000

    def withdraw(self, amount):
        if amount > self.balance:
            raise InsufficientBalanceException("Insufficient Funds. Cannot withdraw")
        self.balance -= amount
        print("Withdrawal successful")


account = BankAccount()
amount = int(input())

try:
    account.withdraw(amount)
except InsufficientBalanceException as e:
    print(e)
