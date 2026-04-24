type Props = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ email?: string }>;
};

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { token } = await params;
  const search = (await searchParams) ?? {};

  return (
    <div className="auth-block">
      <h2>Сброс пароля</h2>
      <form
        method="POST"
        action={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/reset-password`}
        className="auth-form"
      >
        <input type="hidden" name="token" value={token} />
        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={search.email ?? ""}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Новый пароль</label>
          <input id="password" name="password" type="password" required />
        </div>
        <div className="form-group">
          <label htmlFor="password_confirmation">Подтверждение</label>
          <input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            required
          />
        </div>
        <button className="btn-submit" type="submit">
          Сохранить пароль
        </button>
      </form>
    </div>
  );
}
