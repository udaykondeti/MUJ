import java.util.Scanner;

public class SumOfTwoNumbers {
    public static void main(String args[]) {
        Scanner sc = new Scanner(System.in);

        //System.out.println("Enter two numbers saperated by space: ");

        String input = sc.nextLine();

        //System.out.println("input: "+input);

        String[] inputArray = input.split(" ");
        int a = Integer.parseInt(inputArray[0]);
        int b = Integer.parseInt(inputArray[1]);

        //System.out.println("a = " + a + " | b = " + b);

        int sum = a + b;

        System.out.println(sum);

        sc.close();
    }
}