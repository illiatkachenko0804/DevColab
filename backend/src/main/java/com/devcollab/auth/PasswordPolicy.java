package com.devcollab.auth;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Authoritative password policy. The frontend mirrors this logic for the live
 * strength meter, but this server-side check is the source of truth.
 *
 * <p>Hard rules (all required): >= 8 chars, lower + upper + digit + symbol, no
 * whitespace, no 3 identical chars in a row, no 3 sequential chars (abc / 321),
 * no 3-char keyboard run (qwe / asd), not a common/easy password.
 *
 * <p>Only {@link Strength#STRONG} passwords are accepted for registration.
 */
public final class PasswordPolicy {

    public enum Strength { WEAK, MEDIUM, STRONG }

    public record Result(boolean valid, Strength strength, List<String> violations) {}

    private static final String[] KEYBOARD_ROWS = {
            "qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890",
    };

    private static final Set<String> COMMON = Set.of(
            "password", "passw0rd", "password1", "qwerty", "qwerty123", "123456",
            "12345678", "123456789", "111111", "abc123", "letmein", "welcome",
            "admin", "iloveyou", "monkey", "dragon", "football", "login",
            "starwars", "master", "hello", "freedom", "whatever", "trustno1");

    private PasswordPolicy() {}

    public static Result evaluate(String pw) {
        List<String> v = new ArrayList<>();
        if (pw == null) pw = "";

        boolean hasLower = pw.chars().anyMatch(Character::isLowerCase);
        boolean hasUpper = pw.chars().anyMatch(Character::isUpperCase);
        boolean hasDigit = pw.chars().anyMatch(Character::isDigit);
        boolean hasWhitespace = pw.chars().anyMatch(Character::isWhitespace);
        boolean hasSymbol = pw.chars().anyMatch(
                c -> !Character.isLetterOrDigit(c) && !Character.isWhitespace(c));

        if (pw.length() < 8) v.add("Use at least 8 characters");
        if (!hasLower) v.add("Add a lowercase letter");
        if (!hasUpper) v.add("Add an uppercase letter");
        if (!hasDigit) v.add("Add a number");
        if (!hasSymbol) v.add("Add a symbol");
        if (hasWhitespace) v.add("Remove spaces");
        if (hasRepeat(pw)) v.add("Avoid 3 identical characters in a row (e.g. aaa)");
        if (hasSequential(pw)) v.add("Avoid sequential characters (e.g. abc, 123)");
        if (hasKeyboardRun(pw)) v.add("Avoid keyboard runs (e.g. qwe, asd)");
        if (isCommon(pw)) v.add("This password is too common");

        Strength strength = strength(pw);
        boolean valid = v.isEmpty() && strength == Strength.STRONG;
        if (valid == false && v.isEmpty() && strength != Strength.STRONG) {
            v.add("Make it longer (12+ characters) for a strong password");
        }
        return new Result(valid, strength, v);
    }

    public static Strength strength(String pw) {
        if (pw == null) pw = "";
        int score = 0;
        if (pw.length() >= 8) score++;
        if (pw.length() >= 12) score++;
        if (pw.length() >= 16) score++;
        if (pw.chars().anyMatch(Character::isLowerCase)) score++;
        if (pw.chars().anyMatch(Character::isUpperCase)) score++;
        if (pw.chars().anyMatch(Character::isDigit)) score++;
        if (pw.chars().anyMatch(c -> !Character.isLetterOrDigit(c) && !Character.isWhitespace(c))) score++;

        // Penalise obvious weaknesses so they can never read as strong.
        if (hasRepeat(pw) || hasSequential(pw) || hasKeyboardRun(pw) || isCommon(pw)) {
            score = Math.min(score, 3);
        }
        if (score <= 3) return Strength.WEAK;
        if (score <= 5) return Strength.MEDIUM;
        return Strength.STRONG;
    }

    private static boolean hasRepeat(String pw) {
        for (int i = 0; i + 2 < pw.length(); i++) {
            if (pw.charAt(i) == pw.charAt(i + 1) && pw.charAt(i + 1) == pw.charAt(i + 2)) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasSequential(String pw) {
        for (int i = 0; i + 2 < pw.length(); i++) {
            int a = pw.charAt(i), b = pw.charAt(i + 1), c = pw.charAt(i + 2);
            if ((b == a + 1 && c == b + 1) || (b == a - 1 && c == b - 1)) return true;
        }
        return false;
    }

    private static boolean hasKeyboardRun(String pw) {
        String lower = pw.toLowerCase();
        for (int i = 0; i + 2 < lower.length(); i++) {
            String sub = lower.substring(i, i + 3);
            String rev = new StringBuilder(sub).reverse().toString();
            for (String row : KEYBOARD_ROWS) {
                if (row.contains(sub) || row.contains(rev)) return true;
            }
        }
        return false;
    }

    private static boolean isCommon(String pw) {
        String lower = pw.toLowerCase();
        if (COMMON.contains(lower)) return true;
        return lower.contains("password") || lower.contains("qwerty");
    }
}
