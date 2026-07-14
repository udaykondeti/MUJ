def fibonacci(n):
    if n == 0:
        return 0
    if n == 1:
        return 1
    return fibonacci(n - 1) + fibonacci(n - 2)


fib_list = []
for i in range(10):
    fib_list.append(fibonacci(i))

print(fib_list)
