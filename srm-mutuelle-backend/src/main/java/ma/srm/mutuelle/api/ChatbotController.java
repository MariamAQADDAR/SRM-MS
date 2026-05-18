package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.ChatbotDtos.ChatMessageRequest;
import ma.srm.mutuelle.api.dto.ChatbotDtos.ChatMessageResponse;
import ma.srm.mutuelle.api.dto.ChatbotDtos.ChatbotBootstrap;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.ChatbotService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

	private final ChatbotService chatbotService;

	@GetMapping("/bootstrap")
	@PreAuthorize("isAuthenticated()")
	public ChatbotBootstrap bootstrap(Authentication authentication) {
		return chatbotService.bootstrap(AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/message")
	@PreAuthorize("isAuthenticated()")
	public ChatMessageResponse message(@Valid @RequestBody ChatMessageRequest body, Authentication authentication) {
		return chatbotService.reply(body.message(), AuthPrincipal.requireUser(authentication));
	}
}
