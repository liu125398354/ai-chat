-- CreateTable
CREATE TABLE "revoked_jwts" (
    "jti" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revoked_jwts_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "revoked_jwts_expires_at_idx" ON "revoked_jwts"("expires_at");
