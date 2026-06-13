package ma.srm.mutuelle.auth.dto;

import jakarta.validation.constraints.NotNull;

public record LinkAgentRequest(@NotNull Long agentId) {}
