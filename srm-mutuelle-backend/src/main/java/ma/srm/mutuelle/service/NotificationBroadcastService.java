package ma.srm.mutuelle.service;

import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.NotificationDtos.BroadcastResponse;
import ma.srm.mutuelle.api.dto.NotificationDtos.BroadcastWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.BroadcastAudience;
import ma.srm.mutuelle.domain.BroadcastStatus;
import ma.srm.mutuelle.domain.Notification;
import ma.srm.mutuelle.domain.NotificationBroadcast;
import ma.srm.mutuelle.domain.repo.AppUserRepository;
import ma.srm.mutuelle.domain.repo.NotificationBroadcastRepository;
import ma.srm.mutuelle.domain.repo.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class NotificationBroadcastService {

	private final NotificationBroadcastRepository broadcastRepository;
	private final NotificationRepository notificationRepository;
	private final AppUserRepository appUserRepository;

	public List<BroadcastResponse> listAll(AppUser user) {
		AccessRules.assertStaffWrite(user);
		return broadcastRepository.findAll().stream().map(this::toDto).toList();
	}

	public List<BroadcastResponse> listDrafts(AppUser user) {
		AccessRules.assertStaffWrite(user);
		return broadcastRepository.findByStatusOrderByCreatedAtDesc(BroadcastStatus.DRAFT).stream()
				.map(this::toDto)
				.toList();
	}

	public BroadcastResponse get(Long id, AppUser user) {
		AccessRules.assertStaffWrite(user);
		return toDto(broadcastRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campagne introuvable")));
	}

	@Transactional
	public BroadcastResponse create(BroadcastWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		NotificationBroadcast b = new NotificationBroadcast();
		b.setTitle(req.title());
		b.setBody(req.body());
		b.setAudience(req.audience());
		b.setStatus(BroadcastStatus.DRAFT);
		b.setCreatedBy(user);
		return toDto(broadcastRepository.save(b));
	}

	@Transactional
	public BroadcastResponse update(Long id, BroadcastWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		NotificationBroadcast b = broadcastRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campagne introuvable"));
		if (b.getStatus() == BroadcastStatus.PUBLISHED) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Campagne déjà publiée");
		}
		b.setTitle(req.title());
		b.setBody(req.body());
		b.setAudience(req.audience());
		return toDto(broadcastRepository.save(b));
	}

	@Transactional
	public BroadcastResponse publish(Long id, AppUser user) {
		AccessRules.assertStaffWrite(user);
		NotificationBroadcast b = broadcastRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campagne introuvable"));
		if (b.getStatus() == BroadcastStatus.PUBLISHED) {
			return toDto(b);
		}
		b.setStatus(BroadcastStatus.PUBLISHED);
		b.setPublishedAt(Instant.now());
		broadcastRepository.save(b);

		String content = b.getTitle() + (b.getBody() != null ? "\n\n" + b.getBody() : "");
		List<AppUser> targets =
				switch (b.getAudience()) {
					case ALL_ADHERENTS -> appUserRepository.findByRoleAndDeletedFalse(AppUserRole.ADHERENT);
					case ALL_USERS -> appUserRepository.findByDeletedFalseOrderById();
				};
		for (AppUser target : targets) {
			Notification n = new Notification();
			n.setAppUser(target);
			n.setNotifType("BROADCAST");
			n.setBody(content);
			n.setReadFlag(false);
			n.setBroadcast(b);
			notificationRepository.save(n);
		}
		return toDto(b);
	}

	private BroadcastResponse toDto(NotificationBroadcast b) {
		return new BroadcastResponse(
				b.getId(),
				b.getTitle(),
				b.getBody(),
				b.getStatus(),
				b.getAudience(),
				b.getCreatedBy().getId(),
				b.getCreatedAt(),
				b.getPublishedAt());
	}
}
