package com.project.conservationGeography.question;

public record QuestionQuizView(

        Long id,
        String topic,
        String questionText,
        String optionA,
        String optionB,
        String optionC,
        String optionD,
        int week

) {
}
