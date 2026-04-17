package webcfg

import (
	"net"
	"os"
	"strings"
)

func Env(name string) string {
	if strings.TrimSpace(name) == "" {
		return ""
	}
	return strings.TrimSpace(os.Getenv(name))
}

func DefaultString(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func SplitCSV(value string) []string {
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		out = append(out, part)
	}
	return out
}

func ParseExactMap(value string) map[string]string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	result := map[string]string{}
	for _, item := range strings.Split(value, ",") {
		parts := strings.SplitN(item, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.ToLower(strings.TrimSpace(parts[0]))
		mapped := strings.TrimSpace(parts[1])
		if key == "" || mapped == "" {
			continue
		}
		result[key] = mapped
	}
	return result
}

func ParseRoleMap(value string) (map[string]string, map[string]string) {
	exact := map[string]string{}
	domain := map[string]string{}
	if value == "" {
		return exact, domain
	}
	entries := strings.Split(value, ",")
	for _, entry := range entries {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		parts := strings.SplitN(entry, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.ToLower(strings.TrimSpace(parts[0]))
		role := strings.ToLower(strings.TrimSpace(parts[1]))
		if key == "" || role == "" {
			continue
		}
		if strings.HasPrefix(key, "*@") {
			domain[strings.TrimPrefix(key, "*@")] = role
			continue
		}
		if strings.HasPrefix(key, "@") {
			domain[strings.TrimPrefix(key, "@")] = role
			continue
		}
		exact[key] = role
	}
	return exact, domain
}

func IsTruthyEnv(name string) bool {
	value := strings.ToLower(Env(name))
	return value == "1" || value == "true" || value == "yes"
}

func IsEnabledUnlessFalseEnv(name string) bool {
	value := strings.ToLower(Env(name))
	return !(value == "0" || value == "false" || value == "no")
}

func ResolveListenAddr(addressEnv, portEnv string, fallbackAddrEnvs []string, defaultAddress, defaultPort string) string {
	address := Env(addressEnv)
	port := Env(portEnv)
	if address != "" || port != "" {
		return joinAddressPort(DefaultString(address, defaultAddress), DefaultString(port, defaultPort))
	}
	for _, envName := range fallbackAddrEnvs {
		if addr := Env(envName); addr != "" {
			return addr
		}
	}
	return joinAddressPort(defaultAddress, defaultPort)
}

func joinAddressPort(address, port string) string {
	if address == "" {
		if port == "" {
			return ""
		}
		return ":" + port
	}
	if port == "" {
		return address
	}
	return net.JoinHostPort(address, port)
}
