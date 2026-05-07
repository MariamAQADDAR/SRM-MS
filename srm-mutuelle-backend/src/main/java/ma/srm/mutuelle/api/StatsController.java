package ma.srm.mutuelle.api;

import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.service.StatsService;
import ma.srm.mutuelle.service.StatsService.StatsSummary;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

	private final StatsService statsService;

	@GetMapping("/summary")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR')")
	public StatsSummary summary() {
		return statsService.getSummary();
	}
}
