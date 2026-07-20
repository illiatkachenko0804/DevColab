public class TestRegex {
    public static void main(String[] args) {
        String q = "illushatkachenko@gmail.com";
        System.out.println("With 4 backslashes: " + q.matches("^[\\\\w.%+-]+@[\\\\w.-]+\\\\.[a-zA-Z]{2,}$"));
        System.out.println("With 2 backslashes: " + q.matches("^[\\w.%+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$"));
    }
}
