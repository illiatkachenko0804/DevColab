package com.devcollab.auth;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        
        String clientRegistrationId = userRequest.getClientRegistration().getRegistrationId();
        
        if ("github".equals(clientRegistrationId)) {
            String email = oAuth2User.getAttribute("email");
            if (email == null || email.isBlank()) {
                // Fetch private emails
                String token = userRequest.getAccessToken().getTokenValue();
                HttpHeaders headers = new HttpHeaders();
                headers.setBearerAuth(token);
                HttpEntity<String> entity = new HttpEntity<>("", headers);
                
                try {
                    ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                            "https://api.github.com/user/emails",
                            HttpMethod.GET,
                            entity,
                            new ParameterizedTypeReference<List<Map<String, Object>>>() {}
                    );
                    
                    List<Map<String, Object>> emails = response.getBody();
                    if (emails != null) {
                        for (Map<String, Object> emailObj : emails) {
                            Boolean primary = (Boolean) emailObj.get("primary");
                            Boolean verified = (Boolean) emailObj.get("verified");
                            if (Boolean.TRUE.equals(primary) && Boolean.TRUE.equals(verified)) {
                                email = (String) emailObj.get("email");
                                break;
                            }
                        }
                    }
                    
                    if (email != null) {
                        Map<String, Object> attributes = new HashMap<>(oAuth2User.getAttributes());
                        attributes.put("email", email);
                        
                        String userNameAttributeName = userRequest.getClientRegistration()
                                .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();
                                
                        return new DefaultOAuth2User(oAuth2User.getAuthorities(), attributes, userNameAttributeName);
                    }
                } catch (Exception e) {
                    // Ignore, fallback to noreply will be handled in OAuth2SuccessHandler
                }
            }
        }
        
        return oAuth2User;
    }
}
