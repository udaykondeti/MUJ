palindromes = []
for num in range(100, 1000):
    if str(num) == str(num)[::-1]:
        palindromes.append(num)

total = sum(palindromes)
average = total / len(palindromes)

result = (total, average)
print(result)
