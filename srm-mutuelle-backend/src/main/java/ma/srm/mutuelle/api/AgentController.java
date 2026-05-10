package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.AgentDtos.AgentResponse;
import ma.srm.mutuelle.api.dto.AgentDtos.AgentWriteRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.service.AgentService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agents")
@RequiredArgsConstructor
public class AgentController {

	private final AgentService agentService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<AgentResponse> list(Authentication authentication) {
		return agentService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public AgentResponse get(@PathVariable Long id, Authentication authentication) {
		return agentService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public AgentResponse create(@Valid @RequestBody AgentWriteRequest body, Authentication authentication) {
		return agentService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public AgentResponse update(
			@PathVariable Long id, @Valid @RequestBody AgentWriteRequest body, Authentication authentication) {
		return agentService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		agentService.delete(id, AuthPrincipal.requireUser(authentication));
	}
}
