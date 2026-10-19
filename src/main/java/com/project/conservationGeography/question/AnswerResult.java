package com.project.conservationGeography.question;

public record AnswerResult(
        boolean correct,
        String correctAnswer,
        String explanation
) {
}
