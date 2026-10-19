package com.project.conservationGeography.question;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByWeekIn(List<Integer> weeks);
    List<Question> findByTopicIgnoreCase(String topic);

    List<Question> findByTopicIgnoreCaseAndWeekIn(
            String topic,
            List<Integer> weeks
    );
}