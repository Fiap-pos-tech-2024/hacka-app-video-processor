# 🔧 Configurar IAM Role e OIDC para GitHub Actions

## CONTA AWS: 497986631333
## ECR: hacka-app-processor ✅ CRIADO

---

## 1️⃣ CRIAR OIDC PROVIDER (SE NÃO EXISTIR)

### AWS Console → IAM → Identity Providers → Add Provider:
- **Provider Type**: OpenID Connect
- **Provider URL**: `https://token.actions.githubusercontent.com`
- **Audience**: `sts.amazonaws.com`

---

## 2️⃣ CRIAR IAM ROLE

### AWS Console → IAM → Roles → Create Role:

#### A) Trusted Entity Type:
- ✅ **Web identity**

#### B) Identity Provider:
- **Identity provider**: `token.actions.githubusercontent.com`
- **Audience**: `sts.amazonaws.com`

#### C) GitHub Organization/Repository:
- **GitHub organization**: `Fiap-pos-tech-2024`
- **GitHub repository**: `hacka-app-processor`
- **Branch**: `main` (ou `*` para todas)

---

## 3️⃣ POLÍTICAS NECESSÁRIAS

Anexe estas políticas à role:

### A) ECR Full Access:
```
AmazonEC2ContainerRegistryFullAccess
```

### B) ECS Full Access:
```
AmazonECS_FullAccess
```

### C) OU Política Customizada (mais restritiva):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories",
        "ecr:CreateRepository"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:ListServices"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 4️⃣ NOME DA ROLE

**Nome obrigatório**: `gh-actions-video-upload-service-role`

---

## 5️⃣ VERIFICAR CONFIGURAÇÃO

Após criar a role, confirme que o ARN é:
```
arn:aws:iam::497986631333:role/gh-actions-video-upload-service-role
```

---

## 6️⃣ TESTAR DEPLOY

Depois de configurar tudo, você pode testar o deploy:
1. Fazer commit no repositório
2. GitHub Actions executará automaticamente
3. Ou executar manualmente via "workflow_dispatch"

---

## ❓ DÚVIDAS COMUNS

**Q: Preciso de AWS Access Keys?**
R: Não! Com OIDC, o GitHub Actions assume a role automaticamente.

**Q: Onde encontro meu usuário/repositório GitHub?**
R: Na URL: `github.com/USUARIO/REPOSITORIO`

**Q: O deploy funciona em branches diferentes?**
R: Sim, mas está configurado para `main`. Pode alterar no YAML.
