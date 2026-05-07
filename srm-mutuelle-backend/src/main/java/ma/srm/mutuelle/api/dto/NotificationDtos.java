package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import ma.srm.mutuelle.domain.BroadcastAudience;
import ma.srm.mutuelle.domain.BroadcastStatus;

public class NotificationDtos {

	public record InboxNotificationResponse(
			Long id, String notifType, String body, boolean read, Instant createdAt, Long broadcastId) {}

	public record BroadcastResponse(
			Long id,
			String title,
			String body,
			BroadcastStatus status,
			BroadcastAudience audience,
			Long createdById,
			Instant createdAt,
			Instant publishedAt) {}

	public record BroadcastWriteRequest(@NotBlank String title, String body, @NotNull BroadcastAudience audience) {}
}
