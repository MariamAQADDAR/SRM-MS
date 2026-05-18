package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class ChatbotDtos {

	public record ChatMessageRequest(@NotBlank String message) {}

	public record QuickPrompt(String id, String label, String text) {}

	public record ChatMessageResponse(String reply, List<QuickPrompt> suggestions) {}

	public record ChatbotBootstrap(
			String welcomeMessage,
			String statusLabel,
			List<QuickPrompt> suggestions,
			boolean personalized) {}
}
