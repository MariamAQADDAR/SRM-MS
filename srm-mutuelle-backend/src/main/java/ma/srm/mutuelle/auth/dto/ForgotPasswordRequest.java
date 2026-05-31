package ma.srm.mutuelle.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
    @NotBlank(message = "L'email est requis")
    @Email(message = "Format d'email invalide")
    String email
) {}
