package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.QuoteDtos.QuoteResponse;
import ma.srm.mutuelle.api.dto.QuoteDtos.QuoteWriteRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.QuoteService;
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
@RequestMapping("/api/quotes")
@RequiredArgsConstructor
public class QuoteController {

	private final QuoteService quoteService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<QuoteResponse> list(Authentication authentication) {
		return quoteService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public QuoteResponse get(@PathVariable Long id, Authentication authentication) {
		return quoteService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public QuoteResponse create(@Valid @RequestBody QuoteWriteRequest body, Authentication authentication) {
		return quoteService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/submit")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public QuoteResponse submit(@PathVariable Long id, Authentication authentication) {
		return quoteService.submit(id, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public QuoteResponse update(
			@PathVariable Long id, @Valid @RequestBody QuoteWriteRequest body, Authentication authentication) {
		return quoteService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		quoteService.delete(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/scan")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public QuoteResponse scan(@PathVariable Long id, Authentication authentication) {
		return quoteService.scan(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/approve")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public QuoteResponse approve(@PathVariable Long id, Authentication authentication) {
		return quoteService.approve(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/reject")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public QuoteResponse reject(@PathVariable Long id, Authentication authentication) {
		return quoteService.reject(id, AuthPrincipal.requireUser(authentication));
	}
}
