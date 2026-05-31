package ma.srm.mutuelle.auth.dto;

public record LoginResponse(String accessToken, UserProfileDto user, boolean forcePasswordChange) {}
