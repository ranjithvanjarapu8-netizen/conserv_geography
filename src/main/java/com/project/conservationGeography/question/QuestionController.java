package com.project.conservationGeography.question;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestParam;
import com.project.conservationGeography.question.QuestionQuizView;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionRepository questionRepository;

    public QuestionController(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    @GetMapping
    public List<QuestionQuizView> getAllQuestions(
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) List<Integer> weeks) {

        boolean hasTopic = topic != null && !topic.isBlank();
        boolean hasWeeks = weeks != null && !weeks.isEmpty();

        List<Question> questions;

        if (hasWeeks && hasTopic) {
            questions = questionRepository
                    .findByTopicIgnoreCaseAndWeekIn(topic, weeks);
        } else if (hasWeeks) {
            questions = questionRepository.findByWeekIn(weeks);
        } else if (hasTopic) {
            questions = questionRepository.findByTopicIgnoreCase(topic);
        } else {
            questions = questionRepository.findAll();
        }

        return questions.stream()
                .map(question -> new QuestionQuizView(
                        question.getId(),
                        question.getTopic(),
                        question.getQuestionText(),
                        question.getOptionA(),
                        question.getOptionB(),
                        question.getOptionC(),
                        question.getOptionD(),
                        question.getWeek()
                ))
                .toList();
    }
    @PostMapping
    public Question addQuestion(@Valid @RequestBody Question question) {
        return questionRepository.save(question);
    }
    @PostMapping("/{id}/answer")
    public AnswerResult checkAnswer(
            @PathVariable Long id,
            @RequestBody AnswerSubmission submission) {

        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Question not found"));

        boolean correct = question.getCorrectAnswer()
                .equalsIgnoreCase(submission.answer().trim());

        return new AnswerResult(
                correct,
                question.getCorrectAnswer(),
                question.getExplanation()
        );
    }
    @PutMapping("/{id}")
    public Question updateQuestion(
            @PathVariable Long id,
            @Valid @RequestBody Question updatedQuestion) {

        Question existingQuestion = questionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Question not found"));

        existingQuestion.setTopic(updatedQuestion.getTopic());
        existingQuestion.setQuestionText(updatedQuestion.getQuestionText());
        existingQuestion.setOptionA(updatedQuestion.getOptionA());
        existingQuestion.setOptionB(updatedQuestion.getOptionB());
        existingQuestion.setOptionC(updatedQuestion.getOptionC());
        existingQuestion.setOptionD(updatedQuestion.getOptionD());
        existingQuestion.setCorrectAnswer(updatedQuestion.getCorrectAnswer());
        existingQuestion.setExplanation(updatedQuestion.getExplanation());

        return questionRepository.save(existingQuestion);
    }
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteQuestion(@PathVariable Long id) {
        if (!questionRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Question not found");
        }

        questionRepository.deleteById(id);
    }
    @PostMapping("/bulk")
    public List<Question> addQuestions(
            @Valid @RequestBody List<@Valid Question> questions) {
        return questionRepository.saveAll(questions);
    }

}
