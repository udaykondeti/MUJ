"""Simple bank account system simulation."""


class InsufficientBalanceError(Exception):
    """Raised when a withdrawal amount exceeds the available balance."""

    def __init__(self, balance, amount):
        self.balance = balance
        self.amount = amount
        super().__init__(
            f"Insufficient balance: tried to withdraw {amount} "
            f"but only {balance} is available."
        )


class BankAccount:
    """A bank account with a starting balance of 5000."""

    def __init__(self, balance=5000):
        self.balance = balance

    def withdraw(self, amount):
        """Withdraw `amount` from the account.

        Raises InsufficientBalanceError if the amount is greater than the
        current balance. Otherwise deducts the amount and displays the
        updated balance.
        """
        if amount > self.balance:
            raise InsufficientBalanceError(self.balance, amount)
        self.balance -= amount
        print(f"Withdrawal successful. Updated balance: {self.balance}")
        return self.balance


def main():
    account = BankAccount()
    print(f"Current balance: {account.balance}")

    try:
        amount = float(input("Enter amount to withdraw: "))
        account.withdraw(amount)
    except InsufficientBalanceError as error:
        print(f"Error: {error}")
    except ValueError:
        print("Error: Please enter a valid numeric amount.")


if __name__ == "__main__":
    main()
